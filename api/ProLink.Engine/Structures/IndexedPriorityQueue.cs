namespace ProLink.Engine.Structures;

public readonly record struct PriorityEntry<TKey, TPriority>(TKey Key, TPriority Priority);

// Binary heap combined with a dictionary from key to heap position for logarithmic updates and removals by key.
// Needed by ReviewQueue so admin review items can have their priorities aged or be removed in O(log n) time.
// Complexity: Insert, ExtractMin, UpdatePriority, and Remove(key) are O(log n); PeekMin and Contains are O(1).
public sealed class IndexedPriorityQueue<TKey, TPriority>
    where TKey : notnull
{
    private readonly Comparison<TPriority> _priorityComparison;
    private readonly Comparison<PriorityEntry<TKey, TPriority>> _entryComparison;
    private readonly Dictionary<TKey, int> _positions;
    private PriorityEntry<TKey, TPriority>[] _heap;
    private int _count;

    public IndexedPriorityQueue(Comparison<TPriority> priorityComparison, int initialCapacity = 16)
    {
        _priorityComparison = priorityComparison ?? throw new ArgumentNullException(nameof(priorityComparison));
        _entryComparison = (left, right) => _priorityComparison(left.Priority, right.Priority);
        int capacity = initialCapacity < 1 ? 16 : initialCapacity;
        _heap = new PriorityEntry<TKey, TPriority>[capacity];
        _positions = new Dictionary<TKey, int>(capacity);
        _count = 0;
    }

    public int Count => _count;

    public bool Contains(TKey key) => _positions.ContainsKey(key);

    public bool TryGetPriority(TKey key, out TPriority priority)
    {
        if (_positions.TryGetValue(key, out int index))
        {
            priority = _heap[index].Priority;
            return true;
        }

        priority = default!;
        return false;
    }

    public void Insert(TKey key, TPriority priority)
    {
        if (_positions.ContainsKey(key))
        {
            throw new InvalidOperationException("Key already exists in IndexedPriorityQueue.");
        }

        EnsureCapacity(_count + 1);
        int index = _count;
        _heap[index] = new PriorityEntry<TKey, TPriority>(key, priority);
        _positions[key] = index;
        _count++;

        HeapCore.SiftUp(_heap, index, _entryComparison, UpdatePositionsOnSwap);
    }

    public PriorityEntry<TKey, TPriority> PeekMin()
    {
        if (_count == 0)
        {
            throw new InvalidOperationException("IndexedPriorityQueue is empty.");
        }
        return _heap[0];
    }

    public PriorityEntry<TKey, TPriority> ExtractMin()
    {
        if (_count == 0)
        {
            throw new InvalidOperationException("IndexedPriorityQueue is empty.");
        }

        var min = _heap[0];
        RemoveAt(0);
        return min;
    }

    public void UpdatePriority(TKey key, TPriority newPriority)
    {
        if (!_positions.TryGetValue(key, out int index))
        {
            throw new KeyNotFoundException("Key was not found in IndexedPriorityQueue.");
        }

        TPriority oldPriority = _heap[index].Priority;
        _heap[index] = new PriorityEntry<TKey, TPriority>(key, newPriority);

        int cmp = _priorityComparison(newPriority, oldPriority);
        if (cmp < 0)
        {
            HeapCore.SiftUp(_heap, index, _entryComparison, UpdatePositionsOnSwap);
        }
        else if (cmp > 0)
        {
            HeapCore.SiftDown(_heap, _count, index, _entryComparison, UpdatePositionsOnSwap);
        }
    }

    public bool Remove(TKey key)
    {
        if (!_positions.TryGetValue(key, out int index))
        {
            return false;
        }

        RemoveAt(index);
        return true;
    }

    public void Clear()
    {
        for (int i = 0; i < _count; i++)
        {
            _heap[i] = default;
        }
        _positions.Clear();
        _count = 0;
    }

    private void RemoveAt(int index)
    {
        TKey removedKey = _heap[index].Key;
        _positions.Remove(removedKey);
        _count--;

        if (index == _count)
        {
            _heap[_count] = default;
            return;
        }

        var moved = _heap[_count];
        _heap[_count] = default;
        _heap[index] = moved;
        _positions[moved.Key] = index;

        int afterUp = HeapCore.SiftUp(_heap, index, _entryComparison, UpdatePositionsOnSwap);
        if (afterUp == index)
        {
            HeapCore.SiftDown(_heap, _count, index, _entryComparison, UpdatePositionsOnSwap);
        }
    }

    private void UpdatePositionsOnSwap(int i, int j)
    {
        _positions[_heap[i].Key] = i;
        _positions[_heap[j].Key] = j;
    }

    private void EnsureCapacity(int required)
    {
        if (required <= _heap.Length)
        {
            return;
        }

        int newCapacity = _heap.Length * 2;
        if (newCapacity < required)
        {
            newCapacity = required;
        }

        var next = new PriorityEntry<TKey, TPriority>[newCapacity];
        for (int i = 0; i < _count; i++)
        {
            next[i] = _heap[i];
        }
        _heap = next;
    }
}
