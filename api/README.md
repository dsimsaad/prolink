# ProLink Core Engine (`api/`)

## Purpose
The Core Engine is a C# ASP.NET Core Web API on .NET 8 backed by a custom Data Structures and Algorithms (DSA) library (`ProLink.Engine`). It powers administrative portal operations, priority review queues, audit log indexing, full-text inverted index search, prefix autocomplete, job state machine validation, sliding-window rate limiting, and Supabase JWT authentication.

---

## Custom DSA Library (`ProLink.Engine`)

`ProLink.Engine` has zero database or web dependencies and implements all core data structures and algorithms without relying on framework sorting (`Array.Sort`, `List.Sort`, `OrderBy`) or collection types (`PriorityQueue`, `Queue`, `LinkedList`, `SortedSet`, etc.).

| Structure / Algorithm | Location | Time Complexity (Main Operations) | Where It Is Used |
| :--- | :--- | :--- | :--- |
| **`IClock` / `SystemClock`** | `Abstractions/IClock.cs` | `UtcNow`: $O(1)$ | `TtlLruCache`, `SlidingWindowLimiter`, `ReviewQueue`, `AuditIndex`, `AdminEngineService`, and `FakeClock` in tests |
| **`DoublyLinkedList<T>`** | `Structures/DoublyLinkedList.cs` | `AddFirst`, `Remove(node)`, `MoveToFront`, `RemoveLast`: $O(1)$ | `LruCache<TKey, TValue>` recency tracking and eviction |
| **`RingQueue<T>`** | `Structures/RingQueue.cs` | `Enqueue`: $O(1)$ amortized; `Dequeue`, `Peek`: $O(1)$ | `SlidingWindowLimiter` per-key request timestamp window |
| **`GrowableArray<T>`** | `Structures/GrowableArray.cs` | `Add`: $O(1)$ amortized; `InsertAt`: $O(n)$; Indexer: $O(1)$ | `InvertedIndex` sorted posting lists |
| **`MinHeap<T>` & `HeapCore`** | `Structures/MinHeap.cs` | `Insert`, `ExtractMin`: $O(\log n)$; `PeekMin`: $O(1)$; `TopK`: $O(n \log k)$ | `IndexedPriorityQueue` (via shared `HeapCore`), `/admin/analytics/top-categories`, and `/admin/analytics/top-areas` |
| **`IndexedPriorityQueue<TKey, TPriority>`** | `Structures/IndexedPriorityQueue.cs` | `Insert`, `ExtractMin`, `UpdatePriority`, `Remove(key)`: $O(\log n)$; `PeekMin`: $O(1)$ | `ReviewQueue` priority ordering, aging recalculation, and removal |
| **`LruCache<TKey, TValue>` & `TtlLruCache`** | `Structures/LruCache.cs` | `TryGet`, `Put`, `Remove`: $O(1)$ | Admin authorization role/suspension cache (60s TTL) and analytics endpoint cache (30s TTL) |
| **`Trie`** | `Structures/Trie.cs` | `Insert`: $O(L)$; `StartsWith(prefix, limit)`: $O(L + k)$ | `UserSearchIndex.Suggest` (`/admin/users/suggest`) |
| **`TextNormalizer`** | `Search/TextNormalizer.cs` | `Normalize`, `Tokenize`: $O(L)$ | Shared by `Trie` and `InvertedIndex` |
| **`InvertedIndex`** | `Search/InvertedIndex.cs` | `Add`: $O(T \log P + P)$; `Search` (two-pointer merge from shortest list): $O(\sum P_i)$ | `UserSearchIndex.Search` (`/admin/users/search`) and `JobSearchIndex.Search` (`/admin/jobs/search`) |
| **`MergeSort`** | `Algorithms/MergeSort.cs` | `Sort`: $O(n \log n)$ worst/average/best, stable | `InvertedIndex` posting-list ordering, `AuditIndex.Load`, `UserSearchIndex.Search`, `JobSearchIndex.Search`, and `/admin/analytics/top-*` |
| **`BinarySearch`** | `Algorithms/BinarySearch.cs` | `LowerBound`, `UpperBound`: $O(\log n)$ | `AuditIndex.CountBetween`, `AuditIndex.Page`, and `AuditIndex.CountPerDay` (`/admin/audit` & `/admin/audit/summary`) |
| **`SlidingWindowLimiter`** | `RateLimiting/SlidingWindowLimiter.cs` | `TryAcquire`: $O(1)$ amortized | `AdminRateLimitMiddleware` protecting all `/admin/*` endpoints |
| **`JobStateMachine`** | `Rules/JobStateMachine.cs` | `CanTransition`, `NextStates`, `CanForceCancel`, `CanResolveDispute`: $O(1)$ | `/admin/jobs/{id}/allowed-actions`, `/admin/jobs/{id}/force-cancel`, and `/admin/disputes/{id}/resolve` |
| **`ReviewQueue`** | `Admin/ReviewQueue.cs` | `Load`: $O(n \log n)$; `Peek(k)`: $O(k \log n)$; `Remove`: $O(\log n)$ | `/admin/review-queue` and `/admin/review-queue/refresh` |
| **`AuditIndex`** | `Admin/AuditIndex.cs` | `Load`: $O(n \log n)$; `Page`: $O(\log n + k)$; `CountBetween`: $O(\log n)$ | `/admin/audit` and `/admin/audit/summary` |
| **`UserSearchIndex`** | `Admin/UserSearchIndex.cs` | `Suggest`: $O(L + k)$; `Search`: $O(P + m \log m)$ | `/admin/users/suggest` and `/admin/users/search` |
| **`JobSearchIndex`** | `Admin/JobSearchIndex.cs` | `Search`: $O(P + m \log m)$ | `/admin/jobs/search` |

---

## Configuration & Environment Variables

Set the following environment variables in Render or your local shell (never commit values):

- `PORT`: HTTP port to bind (default `5080`).
- `SUPABASE_URL`: Base URL of the Supabase project (used to derive the JWKS endpoint `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`).
- `DATABASE_URL`: Supabase session-pooler Postgres URI. Note that this connection runs as the database owner role (`postgres`) which bypasses RLS, so all `/admin` endpoints enforce the C# `"Admin"` authorization policy (`role = 'admin'` and `is_suspended = false`).
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins (default `http://localhost:3000`).
- `RateLimiting__PermitLimit`: Maximum requests allowed per sliding window on `/admin` endpoints (default `60`).
- `RateLimiting__WindowSeconds`: Sliding window duration in seconds (default `60`).

---

## How to Build, Test & Run

```bash
# 1. Build the solution
dotnet build api/ProLink.slnx

# 2. Run all unit and integration tests
dotnet test api/ProLink.slnx

# 3. Run the API locally
PORT=5080 dotnet run --project api/ProLink.Api --no-launch-profile
```

---

## Example `curl` Requests

Replace `<ACCESS_TOKEN>` with a valid administrator Supabase JWT:

```bash
# Public health check
curl -i http://localhost:5080/health

# Admin identity ping
curl -i -H "Authorization: Bearer <ACCESS_TOKEN>" \
  http://localhost:5080/admin/ping

# Fetch top 20 urgent review queue items
curl -i -H "Authorization: Bearer <ACCESS_TOKEN>" \
  "http://localhost:5080/admin/review-queue?limit=20"

# Prefix user suggestions (Trie)
curl -i -H "Authorization: Bearer <ACCESS_TOKEN>" \
  "http://localhost:5080/admin/users/suggest?q=demo&limit=8"

# Full-word user search (InvertedIndex + MergeSort)
curl -i -H "Authorization: Bearer <ACCESS_TOKEN>" \
  "http://localhost:5080/admin/users/search?q=Demo%20Ahmed"

# Analytics funnel and top categories (MinHeap.TopK + MergeSort)
curl -i -H "Authorization: Bearer <ACCESS_TOKEN>" \
  http://localhost:5080/admin/analytics/funnel

curl -i -H "Authorization: Bearer <ACCESS_TOKEN>" \
  "http://localhost:5080/admin/analytics/top-categories?n=5"

# Force-cancel a job
curl -i -X POST \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Customer requested emergency cancellation due to duplicate post."}' \
  http://localhost:5080/admin/jobs/3fa85f64-5717-4562-b3fc-2c963f66afa6/force-cancel

# Resolve a disputed job
curl -i -X POST \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"outcome":"completed","note":"Verified completion photos and customer confirmation."}' \
  http://localhost:5080/admin/disputes/3fa85f64-5717-4562-b3fc-2c963f66afa6/resolve

# Reload all in-memory indices and caches
curl -i -X POST \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  http://localhost:5080/admin/engine/reload
```
