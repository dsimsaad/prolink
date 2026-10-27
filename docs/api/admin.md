# ProLink Admin API Contract (`api/ProLink.Api`)

This document defines the HTTP contract for all administrative endpoints served by the C# ASP.NET Core API (`ProLink.Api`). Frontend clients (`web/src/lib/api/admin.ts`) and automated tests (`api/ProLink.Api.Tests`) must conform to these schemas.

---

## 1. Authentication, Authorization & Rate Limiting

### Authentication & Authorization (`Admin` Policy)
Unless explicitly marked as **Public**, every `/admin/*` endpoint requires:
- **Header**: `Authorization: Bearer <supabase-access-token>`
- **JWT Verification**: Verified via Supabase JWKS (`ES256`) or configured signing key, validating issuer (`${SUPABASE_URL}/auth/v1`), audience (`authenticated`), and token lifetime.
- **Role & Suspension Check**: The caller's user ID is read strictly from the JWT `sub` claim. The backend queries `public.profiles` (cached for 60 seconds in `LruCache<Guid, AdminAuthRecord>`) and verifies:
  - `role = 'admin'`
  - `is_suspended = false`

| Condition | HTTP Status | Error Code |
| :--- | :---: | :--- |
| Missing, malformed, or expired Bearer token | `401 Unauthorized` | `unauthorized` |
| Valid token, but user is not an admin or is suspended | `403 Forbidden` | `forbidden` |

### Rate Limiting (`SlidingWindowLimiter`)
All `/admin/*` paths pass through the sliding-window rate-limiting middleware:
- **Key**: Authenticated user ID (`sub` claim), falling back to client IP (`X-Forwarded-For` first hop or socket remote IP).
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

## 2. System & Identity Endpoints

### `GET /health`
- **Caller**: Public (no authentication required). Independent of database connectivity.
- **Query / Body**: None.
- **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "service": "core-engine",
    "time": "2026-10-27T11:35:00Z"
  }
  ```

### `GET /admin/ping`
- **Caller**: `Admin` policy (`role = 'admin'` and `is_suspended = false`).
- **Query / Body**: None.
- **Response `200 OK`**:
  ```json
  {
    "adminId": "55555555-5555-5555-5555-555555555555",
    "status": "ok"
  }
  ```
- **Error Codes**: `401`, `403`, `429`.

---

## 3. Priority Review Queue Endpoints

### `GET /admin/review-queue`
Returns the most urgent items needing administrator attention (disputed jobs, open reports, and pending professional applications) ordered by `ReviewQueue` (`IndexedPriorityQueue`) using base urgency and an hourly aging bonus.
- **Caller**: `Admin` policy.
- **Query Parameters**:
  - `limit` (optional `int`, default `20`, min `1`, max `100`): Maximum number of items to return.
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "key": "dispute:3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "kind": "dispute",
        "entityId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "title": "AC compressor replacement dispute",
        "subtitle": "Disputed job in Area 02",
        "createdAt": "2026-10-25T09:00:00Z",
        "priorityScore": 42,
        "link": "/admin/disputes/3fa85f64-5717-4562-b3fc-2c963f66afa6"
      }
    ],
    "totalCount": 12,
    "refreshedAt": "2026-10-27T11:35:00Z"
  }
  ```
- **Error Codes**: `400` (`invalid_query`), `401`, `403`, `429`.

### `POST /admin/review-queue/refresh`
Forces an immediate reload of the in-memory `ReviewQueue` from PostgreSQL.
- **Caller**: `Admin` policy.
- **Request Body**: Empty or `{}`.
- **Response `200 OK`**:
  ```json
  {
    "totalCount": 12,
    "refreshedAt": "2026-10-27T11:35:10Z"
  }
  ```
- **Error Codes**: `401`, `403`, `429`.

---

## 4. Audit Log Endpoints

### `GET /admin/audit`
Queries the in-memory `AuditIndex` (sorted array + `BinarySearch` lower/upper bounds) for administrative actions.
- **Caller**: `Admin` policy.
- **Query Parameters**:
  - `from` (optional ISO-8601 timestamp string): Inclusive lower bound timestamp.
  - `to` (optional ISO-8601 timestamp string): Inclusive upper bound timestamp.
  - `page` (optional `int`, default `1`, min `1`): 1-based page number.
  - `pageSize` (optional `int`, default `20`, min `1`, max `100`): Items per page (capped at 100).
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": "b1c2d3e4-0000-0000-0000-000000000001",
        "adminId": "55555555-5555-5555-5555-555555555555",
        "adminName": "Admin User",
        "action": "job_force_cancelled",
        "targetType": "job",
        "targetId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "details": "{\"reason\":\"Customer requested emergency cancellation\",\"fromStatus\":\"Open\"}",
        "createdAt": "2026-10-27T10:15:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "totalCount": 45
  }
  ```
- **Error Codes**: `400` (`invalid_query`), `401`, `403`, `429`.

### `GET /admin/audit/summary`
Returns daily audit action counts for the past `days` days using `AuditIndex.CountPerDay`.
- **Caller**: `Admin` policy.
- **Query Parameters**:
  - `days` (optional `int`, default `14`, min `1`, max `60`): Number of days to summarize.
- **Response `200 OK`**:
  ```json
  {
    "days": 14,
    "totalInPeriod": 28,
    "dailyCounts": [
      {
        "date": "2026-10-14",
        "count": 2
      },
      {
        "date": "2026-10-15",
        "count": 0
      }
    ]
  }
  ```
- **Error Codes**: `400` (`invalid_query`), `401`, `403`, `429`.

---

## 5. User & Job Search Endpoints

### `GET /admin/users/suggest`
Prefix autocomplete over user full names using `UserSearchIndex` (`Trie`). Returns user IDs and display names only.
- **Caller**: `Admin` policy.
- **Query Parameters**:
  - `q` (required `string`, max `80` chars): Name prefix to match.
  - `limit` (optional `int`, default `8`, min `1`, max `25`): Maximum suggestions.
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "displayName": "Demo Ahmed Khan"
      }
    ]
  }
  ```
- **Error Codes**: `400` (`invalid_query`), `401`, `403`, `429`.

### `GET /admin/users/search`
Full-word token search over user names using `UserSearchIndex` (`InvertedIndex` two-pointer intersection + `MergeSort` ranking by matched tokens then recency). Returns user IDs and display names only.
- **Caller**: `Admin` policy.
- **Query Parameters**:
  - `q` (required `string`, max `120` chars): Search query tokens.
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "displayName": "Demo Ahmed Khan",
        "matchedTokens": 2
      }
    ]
  }
  ```
- **Error Codes**: `400` (`invalid_query`), `401`, `403`, `429`.

### `GET /admin/jobs/search`
Keyword search over job titles and descriptions using `JobSearchIndex` (`InvertedIndex` + `MergeSort`). Returns ranked job IDs.
- **Caller**: `Admin` policy.
- **Query Parameters**:
  - `q` (required `string`, max `120` chars): Search keywords.
- **Response `200 OK`**:
  ```json
  {
    "jobIds": [
      "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "7c9e6679-7425-40de-944b-e07fc1f90ae7"
    ]
  }
  ```
- **Error Codes**: `400` (`invalid_query`), `401`, `403`, `429`.

---

## 6. Analytics Endpoints

### `GET /admin/analytics/funnel`
Returns job conversion counts across the marketplace funnel (cached for 30 seconds in `LruCache`).
- **Caller**: `Admin` policy.
- **Query / Body**: None.
- **Response `200 OK`**:
  ```json
  {
    "posted": 40,
    "receivedOffers": 28,
    "assigned": 19,
    "completed": 11
  }
  ```
- **Error Codes**: `401`, `403`, `429`.

### `GET /admin/analytics/top-categories`
Reads grouped category job counts from the repository, selects the top `n` using `MinHeap.TopK`, orders them via `MergeSort` (count descending, then name ascending), and caches the result for 30 seconds in `LruCache`.
- **Caller**: `Admin` policy.
- **Query Parameters**:
  - `n` (optional `int`, default `5`, min `1`, max `50`): Number of top categories to return.
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": 1,
        "name": "Plumbing",
        "jobCount": 12
      },
      {
        "id": 2,
        "name": "Electrical",
        "jobCount": 9
      }
    ]
  }
  ```
- **Error Codes**: `400` (`invalid_query`), `401`, `403`, `429`.

### `GET /admin/analytics/top-areas`
Reads grouped service area job counts from the repository, selects the top `n` using `MinHeap.TopK`, orders them via `MergeSort` (count descending, then name ascending), and caches the result for 30 seconds in `LruCache`.
- **Caller**: `Admin` policy.
- **Query Parameters**:
  - `n` (optional `int`, default `5`, min `1`, max `50`): Number of top areas to return.
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": 1,
        "name": "Area 01",
        "jobCount": 8
      }
    ]
  }
  ```
- **Error Codes**: `400` (`invalid_query`), `401`, `403`, `429`.

---

## 7. Job State Machine & Dispute Resolution Endpoints

### `GET /admin/jobs/{id}/allowed-actions`
Inspects the job's current status and returns the valid next states and administrative actions computed by `JobStateMachine`.
- **Caller**: `Admin` policy.
- **Route Parameters**:
  - `id` (`uuid`): Target job ID.
- **Response `200 OK`**:
  ```json
  {
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "currentStatus": "Open",
    "nextStates": [
      "Offers received",
      "Cancelled",
      "Expired"
    ],
    "canForceCancel": true,
    "canResolveDispute": false,
    "disputeOutcomes": []
  }
  ```
- **Error Codes**: `400` (`invalid_id`), `401`, `403`, `404` (`job_not_found`), `429`.

### `POST /admin/jobs/{id}/force-cancel`
Force-cancels a job when allowed by `JobStateMachine.CanForceCancel(status)` (`Open`, `Offers received`, `Assigned`, `In progress`). Executes a single database transaction that updates `jobs.status = 'Cancelled'`, inserts a `job_events` row with the reason note, and logs an `admin_actions` row.
- **Caller**: `Admin` policy.
- **Route Parameters**:
  - `id` (`uuid`): Target job ID.
- **Request Body**:
  ```json
  {
    "reason": "Customer reported duplicate posting and requested cancellation."
  }
  ```
  - `reason` (required `string`, trimmed length between `10` and `500` characters).
- **Response `200 OK`**:
  ```json
  {
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "previousStatus": "Open",
    "newStatus": "Cancelled"
  }
  ```
- **Error Codes**:
  - `400` (`validation_error`): Missing or short reason (< 10 characters).
  - `401` (`unauthorized`)
  - `403` (`forbidden`)
  - `404` (`job_not_found`): Job ID does not exist.
  - `409` (`invalid_transition`): Job is not in a force-cancellable state (`Open`, `Offers received`, `Assigned`, `In progress`).
  - `429` (`rate_limit_exceeded`)

### `POST /admin/disputes/{id}/resolve`
Resolves a disputed job (`status = 'Disputed'`) to either `Completed` or `Cancelled` as validated by `JobStateMachine.CanResolveDispute(currentStatus, targetStatus)`. Executes a single database transaction that updates `jobs.status`, inserts a `job_events` row with the resolution note, and logs an `admin_actions` row.
- **Caller**: `Admin` policy.
- **Route Parameters**:
  - `id` (`uuid`): Target disputed job ID.
- **Request Body**:
  ```json
  {
    "outcome": "completed",
    "note": "Verified completion photos and customer sign-off in chat transcript."
  }
  ```
  - `outcome` (required `string`): `'completed'` (maps to `'Completed'`) or `'cancelled'` (maps to `'Cancelled'`).
  - `note` (required `string`, trimmed length between `10` and `500` characters).
- **Response `200 OK`**:
  ```json
  {
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "previousStatus": "Disputed",
    "newStatus": "Completed",
    "outcome": "completed"
  }
  ```
- **Error Codes**:
  - `400` (`validation_error`): Invalid outcome or note shorter than 10 characters.
  - `401` (`unauthorized`)
  - `403` (`forbidden`)
  - `404` (`job_not_found`): Job ID does not exist.
  - `409` (`invalid_transition`): Job is not currently in `'Disputed'` status.
  - `429` (`rate_limit_exceeded`)

---

## 8. Engine Management Endpoints

### `POST /admin/engine/reload`
Clears in-memory caches (`LruCache`), rebuilds `ReviewQueue`, `AuditIndex`, `UserSearchIndex`, and `JobSearchIndex` from PostgreSQL, and increments `EngineState` version with a UTC timestamp.
- **Caller**: `Admin` policy.
- **Request Body**: Empty or `{}`.
- **Response `200 OK`**:
  ```json
  {
    "version": 2,
    "reloadedAt": "2026-10-27T11:40:00Z"
  }
  ```
- **Error Codes**: `401`, `403`, `429`.
