using ProLink.Engine.Algorithms;

namespace ProLink.Engine.Admin;

public sealed record AuditEntry(
    string Id,
    string AdminId,
    string AdminName,
    string Action,
    string TargetType,
    string TargetId,
    string DetailsJson,
    DateTimeOffset CreatedAt);

public sealed record DailyAuditCount(string Date, int Count);

// In-memory index of administrative actions kept sorted ascending by timestamp for logarithmic range queries.
// Needed to serve date-filtered audit log pages and daily action summaries without repeated table scans.
// Complexity: Load is O(n log n) via MergeSort; CountBetween is O(log n) via BinarySearch; Page is O(log n + pageSize).
public sealed class AuditIndex
{
    private AuditEntry[] _sorted = Array.Empty<AuditEntry>();
    private readonly object _sync = new();

    public int Count
    {
        get
        {
            lock (_sync)
            {
                return _sorted.Length;
            }
        }
    }

    public void Load(IReadOnlyList<AuditEntry> entries)
    {
        if (entries is null)
        {
            throw new ArgumentNullException(nameof(entries));
        }

        var copy = new AuditEntry[entries.Count];
        for (int i = 0; i < entries.Count; i++)
        {
            copy[i] = entries[i];
        }

        var comparer = MergeSort.ChainComparers<AuditEntry>(
            (a, b) => a.CreatedAt.CompareTo(b.CreatedAt),
            (a, b) => string.CompareOrdinal(a.Id, b.Id));

        MergeSort.Sort(copy, comparer);

        lock (_sync)
        {
            _sorted = copy;
        }
    }

    public int CountBetween(DateTimeOffset from, DateTimeOffset to)
    {
        if (to < from)
        {
            return 0;
        }

        lock (_sync)
        {
            var (start, endExclusive) = GetWindowBounds(_sorted, from, to);
            return endExclusive - start;
        }
    }

    public AuditEntry[] Page(
        int pageNumber,
        int pageSize,
        bool newestFirst,
        DateTimeOffset? from,
        DateTimeOffset? to,
        out int totalMatching)
    {
        int safePage = pageNumber < 1 ? 1 : pageNumber;
        int safeSize = pageSize < 1 ? 20 : (pageSize > 100 ? 100 : pageSize);

        lock (_sync)
        {
            DateTimeOffset minTime = from ?? DateTimeOffset.MinValue;
            DateTimeOffset maxTime = to ?? DateTimeOffset.MaxValue;

            if (maxTime < minTime || _sorted.Length == 0)
            {
                totalMatching = 0;
                return Array.Empty<AuditEntry>();
            }

            var (start, endExclusive) = GetWindowBounds(_sorted, minTime, maxTime);
            totalMatching = endExclusive - start;
            if (totalMatching <= 0)
            {
                totalMatching = 0;
                return Array.Empty<AuditEntry>();
            }

            int skip = (safePage - 1) * safeSize;
            if (skip >= totalMatching)
            {
                return Array.Empty<AuditEntry>();
            }

            int take = totalMatching - skip;
            if (take > safeSize)
            {
                take = safeSize;
            }

            var page = new AuditEntry[take];
            if (newestFirst)
            {
                int firstIndex = (endExclusive - 1) - skip;
                for (int i = 0; i < take; i++)
                {
                    page[i] = _sorted[firstIndex - i];
                }
            }
            else
            {
                int firstIndex = start + skip;
                for (int i = 0; i < take; i++)
                {
                    page[i] = _sorted[firstIndex + i];
                }
            }

            return page;
        }
    }

    public DailyAuditCount[] CountPerDay(int days, DateTimeOffset nowUtc)
    {
        int safeDays = days < 1 ? 1 : (days > 60 ? 60 : days);
        var result = new DailyAuditCount[safeDays];
        DateTime todayUtc = nowUtc.UtcDateTime.Date;

        for (int i = 0; i < safeDays; i++)
        {
            DateTime dayDate = todayUtc.AddDays(-(safeDays - 1 - i));
            var dayStart = new DateTimeOffset(dayDate, TimeSpan.Zero);
            var dayEnd = dayStart.AddDays(1).AddTicks(-1);
            int count = CountBetween(dayStart, dayEnd);
            result[i] = new DailyAuditCount(dayDate.ToString("yyyy-MM-dd"), count);
        }

        return result;
    }

    private static (int Start, int EndExclusive) GetWindowBounds(
        AuditEntry[] sorted,
        DateTimeOffset from,
        DateTimeOffset to)
    {
        int start = BinarySearch.LowerBound(
            sorted,
            from,
            entry => entry.CreatedAt,
            (a, b) => a.CompareTo(b));

        int endExclusive = BinarySearch.UpperBound(
            sorted,
            to,
            entry => entry.CreatedAt,
            (a, b) => a.CompareTo(b));

        if (endExclusive < start)
        {
            endExclusive = start;
        }

        return (start, endExclusive);
    }
}
