using ProLink.Api.Auth;
using ProLink.Api.Data;
using ProLink.Api.Models;
using ProLink.Engine.Abstractions;
using ProLink.Engine.Admin;
using ProLink.Engine.Algorithms;
using ProLink.Engine.Rules;
using ProLink.Engine.Structures;

namespace ProLink.Api.Services;

// Coordinates all in-memory ProLink.Engine indices, caches, and state machines for the Admin API.
public sealed class AdminEngineService
{
    private readonly IAdminRepository _repository;
    private readonly AdminRoleCache _roleCache;
    private readonly IClock _clock;

    private readonly ReviewQueue _reviewQueue = new();
    private readonly AuditIndex _auditIndex = new();
    private readonly UserSearchIndex _userSearchIndex = new();
    private readonly JobSearchIndex _jobSearchIndex = new();
    private readonly JobStateMachine _jobStateMachine = new();
    private readonly TtlLruCache<string, object> _analyticsCache;

    private readonly SemaphoreSlim _loadLock = new(1, 1);
    private DateTimeOffset _reviewQueueLoadedAt = DateTimeOffset.MinValue;
    private DateTimeOffset _auditLoadedAt = DateTimeOffset.MinValue;
    private DateTimeOffset _searchLoadedAt = DateTimeOffset.MinValue;
    private long _engineVersion = 1;
    private DateTimeOffset _engineReloadedAt;

    public AdminEngineService(IAdminRepository repository, AdminRoleCache roleCache, IClock clock)
    {
        _repository = repository;
        _roleCache = roleCache;
        _clock = clock;
        _analyticsCache = new TtlLruCache<string, object>(32, TimeSpan.FromSeconds(30), clock);
        _engineReloadedAt = clock.UtcNow;
    }

    public JobStateMachine StateMachine => _jobStateMachine;
    public long EngineVersion => Interlocked.Read(ref _engineVersion);
    public DateTimeOffset EngineReloadedAt => _engineReloadedAt;

    public async Task<(ReviewQueueItem[] Items, int TotalCount, DateTimeOffset RefreshedAt)> GetReviewQueueAsync(
        int limit,
        CancellationToken ct = default)
    {
        DateTimeOffset now = _clock.UtcNow;
        if (now - _reviewQueueLoadedAt > TimeSpan.FromSeconds(60))
        {
            await RefreshReviewQueueAsync(ct);
        }
        else
        {
            _reviewQueue.RecalculatePriorities(now);
        }

        int safeLimit = limit < 1 ? 20 : (limit > 100 ? 100 : limit);
        var items = _reviewQueue.Peek(safeLimit);
        return (items, _reviewQueue.Count, _reviewQueueLoadedAt);
    }

    public async Task<(int TotalCount, DateTimeOffset RefreshedAt)> RefreshReviewQueueAsync(CancellationToken ct = default)
    {
        await _loadLock.WaitAsync(ct);
        try
        {
            var items = await BuildReviewQueueItemsAsync(ct);
            DateTimeOffset now = _clock.UtcNow;
            _reviewQueue.Refresh(items, now);
            _reviewQueueLoadedAt = now;
            return (_reviewQueue.Count, _reviewQueueLoadedAt);
        }
        finally
        {
            _loadLock.Release();
        }
    }

    public async Task<(AuditEntry[] Items, int TotalCount)> GetAuditPageAsync(
        int page,
        int pageSize,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken ct = default)
    {
        await EnsureAuditLoadedAsync(ct);
        var items = _auditIndex.Page(page, pageSize, newestFirst: true, from, to, out int total);
        return (items, total);
    }

    public async Task<(int TotalInPeriod, DailyAuditCount[] DailyCounts)> GetAuditSummaryAsync(
        int days,
        CancellationToken ct = default)
    {
        await EnsureAuditLoadedAsync(ct);
        int safeDays = days < 1 ? 1 : (days > 60 ? 60 : days);
        var daily = _auditIndex.CountPerDay(safeDays, _clock.UtcNow);

        int total = 0;
        for (int i = 0; i < daily.Length; i++)
        {
            total += daily[i].Count;
        }
        return (total, daily);
    }

    public async Task<UserSearchHit[]> SuggestUsersAsync(string query, int limit, CancellationToken ct = default)
    {
        await EnsureSearchLoadedAsync(ct);
        return _userSearchIndex.Suggest(query, limit);
    }

    public async Task<UserSearchHit[]> SearchUsersAsync(string query, CancellationToken ct = default)
    {
        await EnsureSearchLoadedAsync(ct);
        return _userSearchIndex.Search(query);
    }

    public async Task<string[]> SearchJobsAsync(string query, CancellationToken ct = default)
    {
        await EnsureSearchLoadedAsync(ct);
        return _jobSearchIndex.Search(query);
    }

    public async Task<FunnelCountsRecord> GetFunnelAsync(CancellationToken ct = default)
    {
        const string cacheKey = "funnel";
        lock (_analyticsCache)
        {
            if (_analyticsCache.TryGet(cacheKey, out object cached) && cached is FunnelCountsRecord record)
            {
                return record;
            }
        }

        var fresh = await _repository.GetFunnelCountsAsync(ct);
        lock (_analyticsCache)
        {
            _analyticsCache.Put(cacheKey, fresh);
        }
        return fresh;
    }

    // Note: SQL ORDER BY job_count DESC LIMIT N would also work directly in PostgreSQL.
    // We compute the top N in memory with MinHeap.TopK and order with MergeSort here to reuse ProLink.Engine.
    public async Task<GroupJobCountRecord[]> GetTopCategoriesAsync(int n, CancellationToken ct = default)
    {
        int safeN = n < 1 ? 5 : (n > 50 ? 50 : n);
        string cacheKey = $"top-categories:{safeN}";

        lock (_analyticsCache)
        {
            if (_analyticsCache.TryGet(cacheKey, out object cached) && cached is GroupJobCountRecord[] arr)
            {
                return arr;
            }
        }

        var all = await _repository.GetCategoryJobCountsAsync(ct);
        var top = RankTopGroups(all, safeN);

        lock (_analyticsCache)
        {
            _analyticsCache.Put(cacheKey, top);
        }
        return top;
    }

    // Note: SQL ORDER BY job_count DESC LIMIT N would also work directly in PostgreSQL.
    // We compute the top N in memory with MinHeap.TopK and order with MergeSort here to reuse ProLink.Engine.
    public async Task<GroupJobCountRecord[]> GetTopAreasAsync(int n, CancellationToken ct = default)
    {
        int safeN = n < 1 ? 5 : (n > 50 ? 50 : n);
        string cacheKey = $"top-areas:{safeN}";

        lock (_analyticsCache)
        {
            if (_analyticsCache.TryGet(cacheKey, out object cached) && cached is GroupJobCountRecord[] arr)
            {
                return arr;
            }
        }

        var all = await _repository.GetAreaJobCountsAsync(ct);
        var top = RankTopGroups(all, safeN);

        lock (_analyticsCache)
        {
            _analyticsCache.Put(cacheKey, top);
        }
        return top;
    }

    public async Task<(long Version, DateTimeOffset ReloadedAt)> ReloadAllAsync(CancellationToken ct = default)
    {
        await _loadLock.WaitAsync(ct);
        try
        {
            _roleCache.Clear();
            lock (_analyticsCache)
            {
                _analyticsCache.Clear();
            }

            DateTimeOffset now = _clock.UtcNow;

            var queueItems = await BuildReviewQueueItemsAsync(ct);
            _reviewQueue.Load(queueItems, now);
            _reviewQueueLoadedAt = now;

            var audits = await _repository.GetRecentAuditEntriesAsync(5000, ct);
            _auditIndex.Load(audits);
            _auditLoadedAt = now;

            var users = await _repository.GetAllUsersForSearchAsync(ct);
            _userSearchIndex.Load(users);

            var jobs = await _repository.GetAllJobsForSearchAsync(ct);
            _jobSearchIndex.Load(jobs);
            _searchLoadedAt = now;

            long nextVersion = Interlocked.Increment(ref _engineVersion);
            _engineReloadedAt = now;
            return (nextVersion, _engineReloadedAt);
        }
        finally
        {
            _loadLock.Release();
        }
    }

    public void InvalidateAfterJobMutation(Guid jobId)
    {
        _reviewQueue.Remove($"dispute:{jobId}");
        _auditLoadedAt = DateTimeOffset.MinValue;
        lock (_analyticsCache)
        {
            _analyticsCache.Clear();
        }
    }

    private static GroupJobCountRecord[] RankTopGroups(IReadOnlyList<GroupJobCountRecord> groups, int n)
    {
        var comparer = MergeSort.ChainComparers<GroupJobCountRecord>(
            (a, b) => b.JobCount.CompareTo(a.JobCount),
            (a, b) => string.Compare(a.Name, b.Name, StringComparison.OrdinalIgnoreCase));

        var topK = MinHeap<GroupJobCountRecord>.TopK(groups, n, comparer);
        MergeSort.Sort(topK, comparer);
        return topK;
    }

    private async Task EnsureAuditLoadedAsync(CancellationToken ct)
    {
        if (_clock.UtcNow - _auditLoadedAt <= TimeSpan.FromSeconds(60))
        {
            return;
        }

        await _loadLock.WaitAsync(ct);
        try
        {
            if (_clock.UtcNow - _auditLoadedAt <= TimeSpan.FromSeconds(60))
            {
                return;
            }

            var audits = await _repository.GetRecentAuditEntriesAsync(5000, ct);
            _auditIndex.Load(audits);
            _auditLoadedAt = _clock.UtcNow;
        }
        finally
        {
            _loadLock.Release();
        }
    }

    private async Task EnsureSearchLoadedAsync(CancellationToken ct)
    {
        if (_clock.UtcNow - _searchLoadedAt <= TimeSpan.FromMinutes(3))
        {
            return;
        }

        await _loadLock.WaitAsync(ct);
        try
        {
            if (_clock.UtcNow - _searchLoadedAt <= TimeSpan.FromMinutes(3))
            {
                return;
            }

            var users = await _repository.GetAllUsersForSearchAsync(ct);
            _userSearchIndex.Load(users);

            var jobs = await _repository.GetAllJobsForSearchAsync(ct);
            _jobSearchIndex.Load(jobs);

            _searchLoadedAt = _clock.UtcNow;
        }
        finally
        {
            _loadLock.Release();
        }
    }

    private async Task<List<ReviewQueueItem>> BuildReviewQueueItemsAsync(CancellationToken ct)
    {
        var pendingApps = await _repository.GetPendingApplicationsAsync(ct);
        var openReports = await _repository.GetOpenReportsAsync(ct);
        var disputedJobs = await _repository.GetDisputedJobsAsync(ct);

        var items = new List<ReviewQueueItem>(pendingApps.Count + openReports.Count + disputedJobs.Count);

        for (int i = 0; i < disputedJobs.Count; i++)
        {
            var d = disputedJobs[i];
            items.Add(new ReviewQueueItem(
                $"dispute:{d.JobId}",
                ReviewItemKind.Dispute,
                d.JobId.ToString(),
                d.Title,
                $"Disputed job in {d.AreaName}",
                d.UpdatedAt,
                $"/admin/disputes/{d.JobId}"));
        }

        for (int i = 0; i < openReports.Count; i++)
        {
            var r = openReports[i];
            items.Add(new ReviewQueueItem(
                $"report:{r.ReportId}",
                ReviewItemKind.Report,
                r.ReportId.ToString(),
                r.Reason,
                $"Report ({r.Status})",
                r.CreatedAt,
                "/admin/reports"));
        }

        for (int i = 0; i < pendingApps.Count; i++)
        {
            var a = pendingApps[i];
            items.Add(new ReviewQueueItem(
                $"application:{a.ProfileId}",
                ReviewItemKind.Application,
                a.ProfileId.ToString(),
                a.FullName,
                $"{a.YearsExperience} yrs experience",
                a.AppliedAt,
                "/admin/applications"));
        }

        return items;
    }
}
