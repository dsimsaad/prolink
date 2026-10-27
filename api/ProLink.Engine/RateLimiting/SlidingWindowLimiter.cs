using ProLink.Engine.Abstractions;
using ProLink.Engine.Structures;

namespace ProLink.Engine.RateLimiting;

// Per-key sliding-window rate limiter backed by a RingQueue of request timestamps per user or IP.
// Needed by the /admin middleware to cap burst traffic and return accurate Retry-After headers.
// Complexity: TryAcquire is O(1) amortized because each timestamp is enqueued and dequeued at most once.
public sealed class SlidingWindowLimiter
{
    private readonly int _maxRequests;
    private readonly TimeSpan _window;
    private readonly IClock _clock;
    private readonly Dictionary<string, RingQueue<DateTimeOffset>> _queues = new();
    private readonly object _sync = new();
    private int _opsSinceSweep;

    public SlidingWindowLimiter(int maxRequests, TimeSpan window, IClock clock)
    {
        if (maxRequests < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(maxRequests), "Max requests must be at least 1.");
        }
        if (window <= TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(window), "Window must be positive.");
        }

        _maxRequests = maxRequests;
        _window = window;
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    }

    public int TrackedKeyCount
    {
        get
        {
            lock (_sync)
            {
                return _queues.Count;
            }
        }
    }

    public bool TryAcquire(string key, out int retryAfterSeconds)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            key = "anonymous";
        }

        lock (_sync)
        {
            DateTimeOffset now = _clock.UtcNow;
            DateTimeOffset cutoff = now - _window;

            _opsSinceSweep++;
            if (_opsSinceSweep >= 256)
            {
                SweepIdleKeys(cutoff);
                _opsSinceSweep = 0;
            }

            if (!_queues.TryGetValue(key, out var queue))
            {
                queue = new RingQueue<DateTimeOffset>();
                _queues[key] = queue;
            }

            EvictExpired(queue, cutoff);

            if (queue.Count < _maxRequests)
            {
                queue.Enqueue(now);
                retryAfterSeconds = 0;
                return true;
            }

            DateTimeOffset oldest = queue.Peek();
            TimeSpan remaining = (oldest + _window) - now;
            int seconds = (int)Math.Ceiling(remaining.TotalSeconds);
            retryAfterSeconds = seconds < 1 ? 1 : seconds;
            return false;
        }
    }

    private static void EvictExpired(RingQueue<DateTimeOffset> queue, DateTimeOffset cutoff)
    {
        while (queue.Count > 0 && queue.Peek() <= cutoff)
        {
            queue.Dequeue();
        }
    }

    private void SweepIdleKeys(DateTimeOffset cutoff)
    {
        var emptyKeys = new List<string>();
        foreach (var pair in _queues)
        {
            EvictExpired(pair.Value, cutoff);
            if (pair.Value.Count == 0)
            {
                emptyKeys.Add(pair.Key);
            }
        }

        for (int i = 0; i < emptyKeys.Count; i++)
        {
            _queues.Remove(emptyKeys[i]);
        }
    }
}
