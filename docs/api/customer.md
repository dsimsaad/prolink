# ProLink Customer API Contract (`api/ProLink.Api`)

This document defines the HTTP contract for all customer job and review endpoints served by the C# ASP.NET Core API (`ProLink.Api`). Frontend clients (`web/src/lib/api/customer.ts`) and automated integration tests (`api/ProLink.Api.Tests`) conform to these schemas.

---

## 1. Authentication, Authorization, Ownership & Rate Limiting

### Authentication & Suspension Check (`Customer` Policy)
Every `/jobs` and `/jobs/*` endpoint requires:
- **Header**: `Authorization: Bearer <supabase-access-token>`
- **JWT Verification**: Verified via Supabase JWKS (`ES256`) or configured signing key, validating issuer (`${SUPABASE_URL}/auth/v1`), audience (`authenticated`), and token lifetime.
- **User Identity**: The caller's user ID is read strictly from the validated JWT `sub` claim. It is never read from a request body, query string, or custom header.
- **Suspension Guard**: The backend checks `public.profiles` (cached for 60 seconds in `AdminRoleCache` backed by `TtlLruCache<Guid, AdminAuthRecord>`) and verifies that the user profile exists and `is_suspended = false`.

| Condition | HTTP Status | Error Code |
| :--- | :---: | :--- |
| Missing, malformed, or expired Bearer token | `401 Unauthorized` | `unauthorized` |
| Valid token, but user is suspended | `403 Forbidden` | `account_suspended` |
| Job does not exist or belongs to another customer | `404 Not Found` | `job_not_found` |

### Ownership & ID Privacy
A customer can act only on their own jobs (`jobs.customer_id = <jwt-sub>`). Whenever a requested job ID does not exist **or** belongs to a different customer, the API returns `404 Not Found` (`job_not_found`) — never `403 Forbidden` — so that other customers' job IDs are never revealed.

### Rate Limiting (`SlidingWindowLimiter`)
All `/jobs` and `/jobs/*` paths pass through the sliding-window rate-limiting middleware:
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

---

## 2. Input Validation Rules for Job Fields

Used by `POST /jobs`, `PATCH /jobs/{id}`, and verified before `POST /jobs/{id}/publish`:
- `title`: Required string; trimmed length must be between **5** and **120** characters.
- `description`: Required string; trimmed length must be between **20** and **2000** characters.
- `categoryId`: Required positive integer (`long`); must exist in `public.categories` with `is_active = true`.
- `areaId`: Required positive integer (`long`); must exist in `public.areas`.
- `budgetMin`: Optional decimal (`numeric(10,2)`); when provided, must be `>= 0`.
- `budgetMax`: Optional decimal (`numeric(10,2)`); when provided, must be `>= 0`. When both `budgetMin` and `budgetMax` are provided, `budgetMin <= budgetMax`.
- `urgency`: Optional string (defaults to `"normal"`); must be `"normal"` or `"urgent"`.

---

## 3. Customer Job Endpoints

### `POST /jobs`
Creates a new job owned by the authenticated customer as either `'Draft'` (`publish: false`) or `'Open'` (`publish: true`).
- **Caller**: Authenticated non-suspended user.
- **Request Body**:
  ```json
  {
    "title": "Split AC indoor unit water leakage",
    "description": "Water is dripping from the indoor unit of our 1.5 ton split AC in the living room after 20 minutes of running.",
    "categoryId": 5,
    "areaId": 1,
    "budgetMin": 1500,
    "budgetMax": 3500,
    "urgency": "normal",
    "publish": true
  }
  ```
- **Transaction & Matching Behavior**:
  - Executes inside a single PostgreSQL transaction.
  - When `publish` is `false`: inserts `jobs` with `status = 'Draft'`, `expires_at = null`, and writes a `job_events` row (`from_status = null`, `to_status = 'Draft'`, `actor_id = userId`, `note = "Job saved as draft."`).
  - When `publish` is `true`: inserts `jobs` with `status = 'Open'`, `expires_at = UtcNow + 7 days`, writes a `job_events` row (`from_status = null`, `to_status = 'Open'`, `actor_id = userId`, `note = "Job published by customer."`), and invokes `IJobMatcher` (`FallbackMatcher`) to notify up to 5 approved, available, non-suspended professionals who cover `categoryId` and `areaId` (excluding the customer).
- **Response `201 Created`**:
  ```json
  {
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "status": "Open",
    "expiresAt": "2026-11-22T11:45:00Z",
    "matchedProfessionals": 4
  }
  ```
- **Error Codes**: `400` (`validation_error`), `401` (`unauthorized`), `403` (`account_suspended`), `429` (`rate_limit_exceeded`).

---

### `PATCH /jobs/{id}`
Edits a job owned by the caller. Only jobs currently in `'Draft'` status can be edited.
- **Caller**: Authenticated non-suspended owner of the job.
- **Route Parameters**:
  - `id` (`uuid`): Target job ID.
- **Request Body**:
  ```json
  {
    "title": "Split AC indoor unit drain repair and service",
    "description": "Updated description: indoor unit drain line appears blocked and needs full cleaning and pressure check.",
    "categoryId": 5,
    "areaId": 2,
    "budgetMin": 2000,
    "budgetMax": 4000,
    "urgency": "urgent"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "status": "Draft",
    "updatedAt": "2026-11-15T12:00:00Z"
  }
  ```
- **Error Codes**:
  - `400` (`invalid_id`, `validation_error`)
  - `401` (`unauthorized`)
  - `403` (`account_suspended`)
  - `404` (`job_not_found`): Job does not exist or belongs to another customer.
  - `409` (`invalid_transition`): Job is not in `'Draft'` status.
  - `429` (`rate_limit_exceeded`)

---

### `POST /jobs/{id}/publish`
Publishes a caller-owned `'Draft'` job to `'Open'`, sets `expires_at` to 7 days from publication, records a `job_events` row, and runs `IJobMatcher`.
- **Caller**: Authenticated non-suspended owner of the job.
- **Route Parameters**:
  - `id` (`uuid`): Target draft job ID.
- **Request Body**: Empty or `{}`.
- **Response `200 OK`**:
  ```json
  {
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "previousStatus": "Draft",
    "newStatus": "Open",
    "expiresAt": "2026-11-22T12:10:00Z",
    "matchedProfessionals": 3
  }
  ```
- **Error Codes**: `400` (`invalid_id`, `validation_error`), `401`, `403`, `404` (`job_not_found`), `409` (`invalid_transition` when job is not `'Draft'`), `429`.

---

### `POST /jobs/{id}/cancel`
Cancels a caller-owned job before work starts. Allowed from `'Draft'`, `'Open'`, `'Offers received'`, and `'Assigned'`.
- **Caller**: Authenticated non-suspended owner of the job.
- **Route Parameters**:
  - `id` (`uuid`): Target job ID.
- **Request Body** (optional):
  ```json
  {
    "note": "No longer needed, fixed the issue ourselves."
  }
  ```
  - `note` (optional `string`, max `500` characters).
- **Transaction Behavior**:
  - Validates transition via `JobStateMachine.CanCustomerCancel(status)` and `JobStateMachine.CanTransition(status, "Cancelled")`.
  - Updates `jobs.status = 'Cancelled'`.
  - Marks all `'pending'` offers on the job as `'rejected'`.
  - Inserts a `job_events` row (`from_status`, `to_status = 'Cancelled'`, `actor_id = userId`, `note`).
  - If the job had an `assigned_professional_id`, writes a `'job_status_changed'` notification for that professional (`payload: { "job_id": "...", "title": "...", "status": "Cancelled" }`).
- **Response `200 OK`**:
  ```json
  {
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "previousStatus": "Open",
    "newStatus": "Cancelled"
  }
  ```
- **Error Codes**: `400` (`invalid_id`, `validation_error`), `401`, `403`, `404` (`job_not_found`), `409` (`invalid_transition` when job is `'In progress'`, `'Completed'`, `'Cancelled'`, `'Expired'`, or `'Disputed'`), `429`.

---

### `POST /jobs/{id}/offers/{offerId}/accept`
Accepts a pending offer on a caller-owned job in `'Open'` or `'Offers received'` status.
- **Caller**: Authenticated non-suspended owner of the job.
- **Route Parameters**:
  - `id` (`uuid`): Target job ID.
  - `offerId` (`uuid`): Target offer ID belonging to the job.
- **Request Body**: Empty or `{}`.
- **Transaction Behavior**:
  - Validates that the job is in `'Open'` or `'Offers received'` (`JobStateMachine.CanTransition(job.Status, "Assigned")`) and the offer belongs to `{id}` with `status = 'pending'`.
  - Marks `{offerId}` as `'accepted'` and every other `'pending'` offer on `{id}` as `'rejected'`.
  - Updates `jobs` to `status = 'Assigned'` and `assigned_professional_id = offer.professional_id`.
  - Inserts a `job_events` row (`from_status`, `to_status = 'Assigned'`, `actor_id = userId`, `note = "Offer accepted by customer."`).
  - Creates the 1-to-1 `conversations` row for `{id}` (`ON CONFLICT (job_id) DO NOTHING`).
  - Inserts an `'offer_accepted'` notification for the accepted professional and a `'job_status_changed'` notification for each rejected professional.
- **Response `200 OK`**:
  ```json
  {
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "offerId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "assignedProfessionalId": "d0000000-0000-4000-8000-000000000001",
    "previousStatus": "Offers received",
    "newStatus": "Assigned",
    "conversationId": "a1b2c3d4-0000-4000-8000-000000000001"
  }
  ```
- **Error Codes**: `400` (`invalid_id`), `401`, `403`, `404` (`job_not_found`, `offer_not_found`), `409` (`invalid_transition` if job is not `'Open'`/`'Offers received'` or offer is not `'pending'`), `429`.

---

### `POST /jobs/{id}/complete`
Confirms work completion on a caller-owned job, transitioning it from `'In progress'` to `'Completed'`.
- **Caller**: Authenticated non-suspended owner of the job.
- **Route Parameters**:
  - `id` (`uuid`): Target job ID.
- **Request Body**: Empty or `{}`.
- **Transaction Behavior**:
  - Validates `job.Status == "In progress"` and `JobStateMachine.CanTransition(job.Status, "Completed")`.
  - Updates `jobs.status = 'Completed'`.
  - Inserts a `job_events` row (`from_status = 'In progress'`, `to_status = 'Completed'`, `actor_id = userId`, `note = "Customer confirmed work completion."`).
  - Inserts a `'job_status_changed'` notification for `assigned_professional_id`.
- **Response `200 OK`**:
  ```json
  {
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "previousStatus": "In progress",
    "newStatus": "Completed"
  }
  ```
- **Error Codes**: `400` (`invalid_id`), `401`, `403`, `404` (`job_not_found`), `409` (`invalid_transition`), `429`.

---

### `POST /jobs/{id}/dispute`
Opens a dispute on a caller-owned job in `'Assigned'` or `'In progress'` status, transitioning it to `'Disputed'`.
- **Caller**: Authenticated non-suspended owner of the job.
- **Route Parameters**:
  - `id` (`uuid`): Target job ID.
- **Request Body**:
  ```json
  {
    "reason": "The pipe joint started leaking again within an hour of the technician leaving."
  }
  ```
  - `reason` (required `string`, trimmed length between **10** and **1000** characters).
- **Transaction Behavior**:
  - Validates `JobStateMachine.CanTransition(job.Status, "Disputed")` (true only for `'Assigned'` and `'In progress'`).
  - Updates `jobs.status = 'Disputed'`.
  - Inserts a `job_events` row (`from_status`, `to_status = 'Disputed'`, `actor_id = userId`, `note = reason`).
  - Inserts a `'job_status_changed'` notification for `assigned_professional_id`.
- **Response `200 OK`**:
  ```json
  {
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "previousStatus": "In progress",
    "newStatus": "Disputed"
  }
  ```
- **Error Codes**: `400` (`invalid_id`, `validation_error`), `401`, `403`, `404` (`job_not_found`), `409` (`invalid_transition`), `429`.

---

### `POST /jobs/{id}/review`
Submits a 1-to-5 star review for a completed caller-owned job. Allowed only once per job.
- **Caller**: Authenticated non-suspended owner of the job.
- **Route Parameters**:
  - `id` (`uuid`): Target completed job ID.
- **Request Body**:
  ```json
  {
    "rating": 5,
    "comment": "Arrived on time, diagnosed the fault quickly, and left the work area clean."
  }
  ```
  - `rating` (required `int`, between **1** and **5** inclusive).
  - `comment` (optional `string`, trimmed length up to **1000** characters).
- **Transaction & Trigger Behavior**:
  - Verifies job ownership and `job.Status == "Completed"` (returning `409 invalid_transition` if not completed).
  - Inserts into `public.reviews (job_id, reviewer_id, professional_id, rating, comment)`, which invokes PostgreSQL triggers `trg_validate_review` and `trg_update_professional_rating`.
  - If a review already exists for the job (checked or caught from PostgreSQL unique constraint `23505`), returns `409 Conflict` (`already_reviewed`).
- **Response `201 Created`**:
  ```json
  {
    "reviewId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "professionalId": "d0000000-0000-4000-8000-000000000001",
    "rating": 5,
    "comment": "Arrived on time, diagnosed the fault quickly, and left the work area clean."
  }
  ```
- **Error Codes**: `400` (`invalid_id`, `validation_error`), `401`, `403`, `404` (`job_not_found`), `409` (`invalid_transition` when job is not `'Completed'`, or `already_reviewed` on a second attempt), `429`.

---

### `GET /jobs/suggest-category`
Optional helper that calls the Python Insight service (`POST ${INSIGHT_URL}/classify`) with a 3-second timeout to suggest an active trade category for the given job text.
- **Caller**: Authenticated non-suspended user.
- **Query Parameters**:
  - `text` (required `string`): Combined job title and/or description text.
- **Behavior**:
  - If `INSIGHT_URL` is not configured, `text` is shorter than 5 characters, the Python service times out or errors, or `is_fallback` is `true`, returns `200 OK` with `suggestedCategory: null`.
- **Response `200 OK`**:
  ```json
  {
    "suggestedCategory": "Plumbing",
    "categoryId": 1,
    "confidence": 0.84
  }
  ```
