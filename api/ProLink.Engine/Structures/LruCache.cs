using ProLink.Engine.Abstractions;

namespace ProLink.Engine.Structures;

// Least-Recently-Used cache combining a dictionary with a DoublyLinkedList for constant-time lookups and eviction.
// Needed to bound memory while caching frequently read admin authorization records and analytics summaries.
// Complexity: TryGet, Put, and Remove are all O(1).
public sealed class LruCache<TKey, TValue>
    where TKey : notnull
{
    private readonly struct Entry
    {
        public Entry(TKey key, TValue value)
        {
            Key = key;
            Value = value;
        }

        public TKey Key { get; }
        public TValue Value { get; }
    }

    private readonly int _capacity;
    private readonly Dictionary<TKey, DoublyLinkedNode<Entry>> _map;
    private readonly DoublyLinkedList<Entry> _order;

    public LruCache(int capacity)
    {
        if (capacity < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(capacity), "Capacity must be at least 1.");
        }

        _capacity = capacity;
        _map = new Dictionary<TKey, DoublyLinkedNode<Entry>>(capacity);
        _order = new DoublyLinkedList<Entry>();
    }

    public int Count => _map.Count;
    public int Capacity => _capacity;

    public bool TryGet(TKey key, out TValue value)
    {
        if (_map.TryGetValue(key, out var node))
        {
            _order.MoveToFront(node);
            value = node.Value.Value;
            return true;
        }

        value = default!;
        return false;
    }

    public void Put(TKey key, TValue value)
    {
        if (_map.TryGetValue(key, out var existingNode))
        {
            existingNode.Value = new Entry(key, value);
            _order.MoveToFront(existingNode);
            return;
        }

        if (_map.Count >= _capacity)
        {
            var evicted = _order.RemoveLast();
            if (evicted is not null)
            {
                _map.Remove(evicted.Value.Key);
            }
        }

        var addedNode = _order.AddFirst(new Entry(key, value));
        _map[key] = addedNode;
    }

    public bool Remove(TKey key)
    {
        if (!_map.TryGetValue(key, out var node))
        {
            return false;
        }

        _order.Remove(node);
        _map.Remove(key);
        return true;
    }

    public void Clear()
    {
        _map.Clear();
        _order.Clear();
    }
}

// Time-to-live wrapper over LruCache using an injected IClock so expired entries are evicted on read.
// Used by both the admin role authorization cache (60s TTL) and the analytics endpoint cache (30s TTL).
// Complexity: TryGet, Put, and Remove are all O(1).
public sealed class TtlLruCache<TKey, TValue>
    where TKey : notnull
{
    private readonly record struct TimedValue(TValue Value, DateTimeOffset ExpiresAt);

    private readonly LruCache<TKey, TimedValue> _inner;
    private readonly IClock _clock;
    private readonly TimeSpan _defaultTtl;

    public TtlLruCache(int capacity, TimeSpan defaultTtl, IClock clock)
    {
        if (defaultTtl <= TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(defaultTtl), "TTL must be positive.");
        }

        _inner = new LruCache<TKey, TimedValue>(capacity);
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        _defaultTtl = defaultTtl;
    }

    public int Count => _inner.Count;

    public bool TryGet(TKey key, out TValue value)
    {
        if (_inner.TryGet(key, out var timed))
        {
            if (_clock.UtcNow < timed.ExpiresAt)
            {
                value = timed.Value;
                return true;
            }

            _inner.Remove(key);
        }

        value = default!;
        return false;
    }

    public void Put(TKey key, TValue value, TimeSpan? customTtl = null)
    {
        TimeSpan ttl = customTtl ?? _defaultTtl;
        DateTimeOffset expiresAt = _clock.UtcNow.Add(ttl);
        _inner.Put(key, new TimedValue(value, expiresAt));
    }

    public bool Remove(TKey key) => _inner.Remove(key);

    public void Clear() => _inner.Clear();
}
