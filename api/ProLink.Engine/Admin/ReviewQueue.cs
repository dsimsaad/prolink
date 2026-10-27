using ProLink.Engine.Structures;

namespace ProLink.Engine.Admin;

public enum ReviewItemKind
{
    Dispute = 1,
    Report = 2,
    Application = 3,
}

public sealed record ReviewQueueItem(
    string Key,
    ReviewItemKind Kind,
    string EntityId,
    string Title,
    string Subtitle,
    DateTimeOffset CreatedAt,
    string Link,
    double PriorityScore = 0);

// Priority queue of items needing administrator attention (disputes, open reports, pending applications).
// Uses IndexedPriorityQueue where lower priority numbers are more urgent: disputes start at 100, reports at 200,
// applications at 300, minus 1 point for every hour spent waiting so older items naturally bubble up.
// Complexity: Load/Refresh is O(n log n), Peek(k) is O(k log n), Remove is O(log n), RecalculatePriorities is O(n log n).
public sealed class ReviewQueue
{
    private readonly IndexedPriorityQueue<string, double> _queue = new((a, b) => a.CompareTo(b));
    private readonly Dictionary<string, ReviewQueueItem> _items = new();
    private readonly object _sync = new();

    public int Count
    {
        get
        {
            lock (_sync)
            {
                return _queue.Count;
            }
        }
    }

    public void Load(IReadOnlyList<ReviewQueueItem> items, DateTimeOffset now)
    {
        if (items is null)
        {
            throw new ArgumentNullException(nameof(items));
        }

        lock (_sync)
        {
            _queue.Clear();
            _items.Clear();

            for (int i = 0; i < items.Count; i++)
            {
                var item = items[i];
                if (string.IsNullOrWhiteSpace(item.Key) || _items.ContainsKey(item.Key))
                {
                    continue;
                }

                double score = ComputePriority(item.Kind, item.CreatedAt, now);
                var scoredItem = item with { PriorityScore = Math.Round(score, 2) };
                _items[item.Key] = scoredItem;
                _queue.Insert(item.Key, score);
            }
        }
    }

    public void Refresh(IReadOnlyList<ReviewQueueItem> items, DateTimeOffset now)
    {
        Load(items, now);
    }

    // Returns the n most urgent items in priority order without removing them from the queue.
    // How this works: a binary heap only exposes the single minimum at the root, so we extract the minimum
    // up to n times into a temporary buffer (O(n log N)) and immediately re-insert those extracted entries
    // back into the IndexedPriorityQueue before returning the snapshot.
    public ReviewQueueItem[] Peek(int n)
    {
        if (n <= 0)
        {
            return Array.Empty<ReviewQueueItem>();
        }

        lock (_sync)
        {
            int take = n < _queue.Count ? n : _queue.Count;
            if (take == 0)
            {
                return Array.Empty<ReviewQueueItem>();
            }

            var extracted = new PriorityEntry<string, double>[take];
            var result = new ReviewQueueItem[take];

            for (int i = 0; i < take; i++)
            {
                var entry = _queue.ExtractMin();
                extracted[i] = entry;
                result[i] = _items[entry.Key];
            }

            for (int i = 0; i < take; i++)
            {
                _queue.Insert(extracted[i].Key, extracted[i].Priority);
            }

            return result;
        }
    }

    public bool Remove(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return false;
        }

        lock (_sync)
        {
            _items.Remove(key);
            return _queue.Remove(key);
        }
    }

    public void RecalculatePriorities(DateTimeOffset now)
    {
        lock (_sync)
        {
            var keys = new List<string>(_items.Count);
            foreach (var pair in _items)
            {
                keys.Add(pair.Key);
            }

            for (int i = 0; i < keys.Count; i++)
            {
                string key = keys[i];
                var current = _items[key];
                double updatedScore = ComputePriority(current.Kind, current.CreatedAt, now);
                _items[key] = current with { PriorityScore = Math.Round(updatedScore, 2) };
                _queue.UpdatePriority(key, updatedScore);
            }
        }
    }

    public static double ComputePriority(ReviewItemKind kind, DateTimeOffset createdAt, DateTimeOffset now)
    {
        double basePriority = kind switch
        {
            ReviewItemKind.Dispute => 100.0,
            ReviewItemKind.Report => 200.0,
            ReviewItemKind.Application => 300.0,
            _ => 400.0,
        };

        double hoursWaiting = Math.Max(0.0, (now - createdAt).TotalHours);
        return basePriority - hoursWaiting;
    }
}
