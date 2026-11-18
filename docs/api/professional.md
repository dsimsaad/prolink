# ProLink Professional API Contract (`api/ProLink.Api`)

This document defines the HTTP contract for all professional dashboard write endpoints served by the C# ASP.NET Core API (`ProLink.Api`). Frontend clients (`web/src/lib/api/professional.ts`) and automated integration tests (`api/ProLink.Api.Tests`) conform to these schemas.

---

## 1. Authentication, Authorization, Ownership & Rate Limiting

### Authentication & Authorization (`ApprovedProfessional` Policy)
Every `/pro/*` endpoint requires:
- **Header**: `Authorization: Bearer <supabase-access-token>`
- **JWT Verification**: Verified via Supabase JWKS (`ES256`) or configured signing key, validating issuer (`${SUPABASE_URL}/auth/v1`), audience (`authenticated`), and token lifetime.
- **User Identity**: The caller's user ID is read strictly from the validated JWT `sub` claim. It is never read from a request body, query string, or custom header.
- **Professional Approval & Suspension Check**: The backend looks up the user's status through `IAdminRepository` backed by the 60-second `AdminRoleCache` (`TtlLruCache<Guid, AdminAuthRecord>`). Authorization succeeds **only** when:
  - `profiles.is_suspended = false`
  - `professional_profiles.status = 'approved'`

| Condition | HTTP Status | Error Code |
| :--- | :---: | :--- |
| Missing, malformed, or expired Bearer token | `401 Unauthorized` | `unauthorized` |
| Valid token, but caller is not an approved professional or is suspended | `403 Forbidden` | `not_approved` |
| Target job or offer does not exist or does not belong to the caller | `404 Not Found` | `job_not_found` / `offer_not_found` |

### Ownership & ID Privacy
For jobs and offers that do not belong to the calling professional (or when an opportunity job is not in an open/biddable state), the API returns `404 Not Found` — never `403 Forbidden` — so that other users' job and offer IDs are not revealed.

### Rate Limiting (`SlidingWindowLimiter`)
All `/pro/*` paths pass through the sliding-window rate-limiting middleware:
- **Key**: Authenticated user ID (`user:<sub-uuid>`), falling back to client IP (`ip:<address>`).
- **Default Window**: `60` requests per `60` seconds (configurable via `RateLimiting:PermitLimit` and `RateLimiting:WindowSeconds`).
- **When Exceeded**:
  - **Status**: `429 Too Many Requests`
  - **Header**: `Retry-After: <seconds>`
  - **Body**:
    ```json
    {
      "code": "rate_limit_exceeded",
      "message": "Too many requests. Please retry after 12 seconds.",
      "retryAfterSeconds": 12
    }
    ```

### Standard Error Response Body
All validation and domain errors return a consistent JSON structure without stack traces or SQL details:
```json
{
  "code": "validation_error",
  "message": "Human-readable explanation of what went wrong."
}
```

### Reads & Direct Supabase Access
The opportunity feed, offer lists, job detail pages, reviews, notifications, and performance statistics are read directly from Supabase by the web application under Row Level Security (RLS) and `SECURITY DEFINER` database functions (`job_offer_counts`, `my_professional_stats`, `update_my_professional_profile`). No redundant read endpoints are added to the C# API.

---

## 2. Professional Offer Endpoints

### `POST /pro/jobs/{id}/offers`
Submits a new offer from the authenticated approved professional on an open job.
- **Caller**: `ApprovedProfessional` policy.
- **Route Parameters**:
  - `id` (`uuid`): Target job ID.
- **Request Body**:
  ```json
  {
    "price": 3200,
    "inspectionFee": 300,
    "etaMinutes": 45,
    "message": "Available today with complete tools and replacement parts."
  }
  ```
- **Validation & Domain Rules**:
  - `price`: Required decimal (`> 0` and `<= 10,000,000` PKR).
  - `inspectionFee`: Optional decimal (defaults to `0`; must be between `0` and `100,000` PKR inclusive).
  - `etaMinutes`: Required integer (between `10` and `10,080` minutes inclusive).
  - `message`: Optional string (trimmed length up to `500` characters).
  - The target job must exist (`404 job_not_found` otherwise).
  - The caller cannot submit an offer on their own job (`job.customer_id == professionalId` $\rightarrow$ `409 own_job`).
  - The job must be in `'Open'` or `'Offers received'` status and not expired (`expires_at == null || expires_at > UtcNow`; otherwise `409 job_closed` / `invalid_transition`).
  - The caller must have `job.category_id` in `public.professional_skills` (`409 category_mismatch` otherwise).
  - Only one offer per job per professional is permitted (`uq_job_professional_offer`). If an offer already exists (including a withdrawn offer), returns `409 duplicate_offer` explaining that only one offer per job is allowed and withdrawn offers cannot be resubmitted.
- **Transaction Behavior**:
  - Inserts the new row in `public.offers` with `status = 'pending'`.
  - If the job is currently `'Open'`, validates `JobStateMachine.CanTransition("Open", "Offers received")`, updates `jobs.status = 'Offers received'`, and writes a `job_events` row (`from_status = 'Open'`, `to_status = 'Offers received'`, `actor_id = professionalId`, `note = "First offer submitted by professional"`).
  - If the job is already `'Offers received'`, writes a `job_events` row (`from_status = 'Offers received'`, `to_status = 'Offers received'`, `actor_id = professionalId`, `note = "Offer submitted by professional"`).
  - Inserts an `'offer_received'` notification for `job.customer_id` with payload `{ "job_id": "...", "offer_id": "...", "professional_name": "...", "title": "...", "price": 3200 }`.
- **Response `201 Created`**:
  ```json
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "professionalId": "d0000000-0000-4000-8000-000000000001",
    "price": 3200,
    "inspectionFee": 300,
    "etaMinutes": 45,
    "message": "Available today with complete tools and replacement parts.",
    "status": "pending",
    "jobStatus": "Offers received",
    "createdAt": "2026-11-18T14:00:00Z",
    "updatedAt": "2026-11-18T14:00:00Z"
  }
  ```
- **Error Codes**:
  - `400` (`invalid_id`, `validation_error`)
  - `401` (`unauthorized`)
  - `403` (`not_approved`)
  - `404` (`job_not_found`)
  - `409` (`own_job`, `category_mismatch`, `duplicate_offer`, `job_closed`, `invalid_transition`)
  - `429` (`rate_limit_exceeded`)

---

### `PATCH /pro/offers/{id}`
Edits the price, inspection fee, arrival time, and message of a caller-owned `'pending'` offer while the associated job is still `'Open'` or `'Offers received'`.
- **Caller**: `ApprovedProfessional` policy.
- **Route Parameters**:
  - `id` (`uuid`): Target offer ID.
- **Request Body**:
  ```json
  {
    "price": 2900,
    "inspectionFee": 200,
    "etaMinutes": 30,
    "message": "Updated quote: can arrive within 30 minutes with spare parts."
  }
  ```
- **Validation & Domain Rules**:
  - Same field validation rules as `POST /pro/jobs/{id}/offers` (`price` `> 0` and `<= 10,000,000`, `inspectionFee` `0..100,000`, `etaMinutes` `10..10,080`, `message` `<= 500` chars).
  - Offer must exist and belong to the caller (`offer.professional_id == professionalId`), otherwise `404 offer_not_found`.
  - Offer `status` must be `'pending'` (`409 offer_not_pending` otherwise).
  - Associated job must be in `'Open'` or `'Offers received'` status and not expired (`409 job_closed` / `invalid_transition` otherwise).
- **Transaction Behavior**:
  - Updates `price`, `inspection_fee`, `eta_minutes`, `message`, and `updated_at = now()` on `public.offers`.
  - Inserts a `job_events` row (`from_status = job.status`, `to_status = job.status`, `actor_id = professionalId`, `note = "Offer updated by professional"`).
- **Response `200 OK`**:
  ```json
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "professionalId": "d0000000-0000-4000-8000-000000000001",
    "price": 2900,
    "inspectionFee": 200,
    "etaMinutes": 30,
    "message": "Updated quote: can arrive within 30 minutes with spare parts.",
    "status": "pending",
    "updatedAt": "2026-11-18T14:15:00Z"
  }
  ```
- **Error Codes**: `400` (`invalid_id`, `validation_error`), `401`, `403` (`not_approved`), `404` (`offer_not_found`), `409` (`offer_not_pending`, `job_closed`, `invalid_transition`), `429`.

---

### `POST /pro/offers/{id}/withdraw`
Withdraws a caller-owned `'pending'` offer (`'pending'` $\rightarrow$ `'withdrawn'`).
- **Caller**: `ApprovedProfessional` policy.
- **Route Parameters**:
  - `id` (`uuid`): Target offer ID.
- **Request Body**: Empty or `{}`.
- **Rules & Important Note**:
  - Offer must exist and belong to the caller (`404 offer_not_found` otherwise).
  - Offer must currently be `'pending'` (`409 offer_not_pending` otherwise; if already withdrawn, the error message notes that a withdrawn offer cannot be withdrawn again or resubmitted because the database permits only one offer per job per professional).
  - Associated job must be in `'Open'` or `'Offers received'` status (`409 invalid_transition` otherwise).
  - **Does not change `jobs.status`**: `JobStateMachine` has no transition from `'Offers received'` back to `'Open'`, and the customer UI counts only `'pending'` and `'accepted'` offers as active.
  - **Cannot be resubmitted**: Because `public.offers` enforces `UNIQUE (job_id, professional_id)`, a withdrawn offer cannot be resubmitted later.
- **Transaction Behavior**:
  - Updates `offers.status = 'withdrawn'` and `updated_at = now()`.
  - Inserts a `job_events` row (`from_status = job.status`, `to_status = job.status`, `actor_id = professionalId`, `note = "Offer withdrawn by professional"`).
- **Response `200 OK`**:
  ```json
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "previousStatus": "pending",
    "status": "withdrawn",
    "updatedAt": "2026-11-18T14:20:00Z"
  }
  ```
- **Error Codes**: `400` (`invalid_id`), `401`, `403` (`not_approved`), `404` (`offer_not_found`), `409` (`offer_not_pending`, `invalid_transition`), `429`.

---

## 3. Professional Job Lifecycle Endpoints

### `POST /pro/jobs/{id}/start`
Transitions an assigned job from `'Assigned'` to `'In progress'` and records `work_started_at`.
- **Caller**: `ApprovedProfessional` policy.
- **Route Parameters**:
  - `id` (`uuid`): Target job ID.
- **Request Body**: Empty or `{}`.
- **Rules & Transaction Behavior**:
  - Job must exist and be assigned to the caller (`job.assigned_professional_id == professionalId`), otherwise `404 job_not_found`.
  - Validates `job.Status == "Assigned"` and `JobStateMachine.CanTransition(job.Status, "In progress")` (`409 invalid_transition` otherwise).
  - Updates `jobs` to `status = 'In progress'`, `work_started_at = COALESCE(work_started_at, now())`, and `updated_at = now()`.
  - Inserts a `job_events` row (`from_status = 'Assigned'`, `to_status = 'In progress'`, `actor_id = professionalId`, `note = "Professional started work"`).
  - Inserts a `'job_started'` notification for `job.customer_id` (`payload: { "job_id": "...", "title": "...", "status": "In progress" }`).
- **Response `200 OK`**:
  ```json
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "previousStatus": "Assigned",
    "status": "In progress",
    "workStartedAt": "2026-11-18T15:00:00Z",
    "updatedAt": "2026-11-18T15:00:00Z"
  }
  ```
- **Error Codes**: `400` (`invalid_id`), `401`, `403` (`not_approved`), `404` (`job_not_found`), `409` (`invalid_transition`), `429`.

---

### `POST /pro/jobs/{id}/mark-done`
Marks an `'In progress'` job as done by the assigned professional (`professional_marked_done_at = now()`) without changing the job's status, prompting the customer to confirm completion.
- **Caller**: `ApprovedProfessional` policy.
- **Route Parameters**:
  - `id` (`uuid`): Target job ID.
- **Request Body** (optional):
  ```json
  {
    "note": "Replaced faulty breaker and tested full load."
  }
  ```
  - `note` (optional `string`, trimmed length up to `500` characters).
- **Rules & Transaction Behavior**:
  - Job must exist and be assigned to the caller (`job.assigned_professional_id == professionalId`), otherwise `404 job_not_found`.
  - Job must be in `'In progress'` status (`409 invalid_transition` otherwise).
  - If `job.professional_marked_done_at` is already set, returns `409 already_marked_done`.
  - Does **not** change `jobs.status` (status remains `'In progress'` until the customer confirms via `POST /jobs/{id}/complete`).
  - Sets `jobs.professional_marked_done_at = now()` and `updated_at = now()`.
  - Inserts a `job_events` row (`from_status = 'In progress'`, `to_status = 'In progress'`, `actor_id = professionalId`, `note = note ?? "Professional marked work as done"`).
  - Inserts a `'work_marked_done'` notification for `job.customer_id` (`payload: { "job_id": "...", "title": "...", "status": "In progress", "professional_marked_done_at": "..." }`).
- **Response `200 OK`**:
  ```json
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "status": "In progress",
    "professionalMarkedDoneAt": "2026-11-18T16:30:00Z",
    "updatedAt": "2026-11-18T16:30:00Z"
  }
  ```
- **Error Codes**: `400` (`invalid_id`, `validation_error`), `401`, `403` (`not_approved`), `404` (`job_not_found`), `409` (`already_marked_done`, `invalid_transition`), `429`.

---

### `POST /pro/jobs/{id}/dispute`
Opens a dispute on a job assigned to the caller from `'Assigned'` or `'In progress'` status, transitioning it to `'Disputed'`.
- **Caller**: `ApprovedProfessional` policy.
- **Route Parameters**:
  - `id` (`uuid`): Target job ID.
- **Request Body**:
  ```json
  {
    "reason": "Customer was unavailable at the agreed location and unreachable by phone."
  }
  ```
  - `reason` (required `string`, trimmed length between `10` and `1000` characters).
- **Rules & Transaction Behavior**:
  - Job must exist and be assigned to the caller (`job.assigned_professional_id == professionalId`), otherwise `404 job_not_found`.
  - Validates `(job.Status == "Assigned" || job.Status == "In progress")` and `JobStateMachine.CanTransition(job.Status, "Disputed")` (`409 invalid_transition` otherwise).
  - Updates `jobs.status = 'Disputed'` and `updated_at = now()`.
  - Inserts a `job_events` row (`from_status = job.Status`, `to_status = 'Disputed'`, `actor_id = professionalId`, `note = reason`).
  - Inserts a `'job_status_changed'` notification for `job.customer_id` (`payload: { "job_id": "...", "title": "...", "status": "Disputed" }`).
- **Response `200 OK`**:
  ```json
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "previousStatus": "In progress",
    "status": "Disputed",
    "updatedAt": "2026-11-18T16:45:00Z"
  }
  ```
- **Error Codes**: `400` (`invalid_id`, `validation_error`), `401`, `403` (`not_approved`), `404` (`job_not_found`), `409` (`invalid_transition`), `429`.
