# ProLink Core Engine (`api/`)

## Purpose
The Core Engine is a high-performance C# ASP.NET Core Web API containing a custom Data Structures and Algorithms (DSA) library (`ProLink.Engine`). It handles administrative and marketplace workflows including priority review queues, audit log indexing, full-text inverted index search, prefix autocomplete, job state transitions, sliding-window rate limiting, and Supabase JWT authentication.

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

## How to Build & Run

```bash
# 1. Build the solution
dotnet build api/ProLink.slnx

# 2. Run test suite
dotnet test api/ProLink.slnx

# 3. Run API locally
PORT=5080 dotnet run --project api/ProLink.Api --no-launch-profile
```
