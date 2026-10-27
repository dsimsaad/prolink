namespace ProLink.Engine.Structures;

// Shared binary heap sift-up and sift-down logic reused by both MinHeap and IndexedPriorityQueue.
// Complexity: SiftUp is O(log n), SiftDown is O(log n).
internal static class HeapCore
{
    public static int SiftUp<T>(
        T[] items,
        int index,
        Comparison<T> comparison,
        Action<int, int>? onSwap = null)
    {
        int current = index;
        while (current > 0)
        {
            int parent = (current - 1) / 2;
            if (comparison(items[current], items[parent]) >= 0)
            {
                break;
            }

            Swap(items, current, parent, onSwap);
            current = parent;
        }
        return current;
    }

    public static int SiftDown<T>(
        T[] items,
        int count,
        int index,
        Comparison<T> comparison,
        Action<int, int>? onSwap = null)
    {
        int current = index;
        while (true)
        {
            int left = (2 * current) + 1;
            int right = left + 1;
            int smallest = current;

            if (left < count && comparison(items[left], items[smallest]) < 0)
            {
                smallest = left;
            }

            if (right < count && comparison(items[right], items[smallest]) < 0)
            {
                smallest = right;
            }

            if (smallest == current)
            {
                break;
            }

            Swap(items, current, smallest, onSwap);
            current = smallest;
        }
        return current;
    }

    public static void Swap<T>(T[] items, int i, int j, Action<int, int>? onSwap)
    {
        T temp = items[i];
        items[i] = items[j];
        items[j] = temp;
        onSwap?.Invoke(i, j);
    }
}

// Array-backed binary min-heap parameterized by a Comparison<T> delegate, plus a bounded TopK selection helper.
// Needed to select the top-N categories and service areas without sorting the entire dataset.
// Complexity: Insert is O(log n), ExtractMin is O(log n), PeekMin is O(1), TopK is O(n log k).
public sealed class MinHeap<T>
{
    private readonly Comparison<T> _comparison;
    private T[] _items;
    private int _count;

    public MinHeap(Comparison<T> comparison, int initialCapacity = 16)
    {
        _comparison = comparison ?? throw new ArgumentNullException(nameof(comparison));
        int capacity = initialCapacity < 1 ? 16 : initialCapacity;
        _items = new T[capacity];
        _count = 0;
    }

    public int Count => _count;

    public void Insert(T item)
    {
        EnsureCapacity(_count + 1);
        _items[_count] = item;
        _count++;
        HeapCore.SiftUp(_items, _count - 1, _comparison);
    }

    public T PeekMin()
    {
        if (_count == 0)
        {
            throw new InvalidOperationException("Heap is empty.");
        }
        return _items[0];
    }

    public T ExtractMin()
    {
        if (_count == 0)
        {
            throw new InvalidOperationException("Heap is empty.");
        }

        T min = _items[0];
        _count--;

        if (_count > 0)
        {
            _items[0] = _items[_count];
            _items[_count] = default!;
            HeapCore.SiftDown(_items, _count, 0, _comparison);
        }
        else
        {
            _items[0] = default!;
        }

        return min;
    }

    public void Clear()
    {
        for (int i = 0; i < _count; i++)
        {
            _items[i] = default!;
        }
        _count = 0;
    }

    internal void ReplaceRoot(T newItem)
    {
        _items[0] = newItem;
        HeapCore.SiftDown(_items, _count, 0, _comparison);
    }

    // Keeps only the k best items according to betterFirstComparison (where betterFirstComparison(a, b) < 0 means a is better than b).
    // Holds a min-heap of size k ordered by the inverted comparison so the root is always the worst of the current top k.
    public static T[] TopK(IReadOnlyList<T> source, int k, Comparison<T> betterFirstComparison)
    {
        if (source is null)
        {
            throw new ArgumentNullException(nameof(source));
        }
        if (betterFirstComparison is null)
        {
            throw new ArgumentNullException(nameof(betterFirstComparison));
        }
        if (k <= 0 || source.Count == 0)
        {
            return Array.Empty<T>();
        }

        Comparison<T> worstAtRootComparison = (a, b) => betterFirstComparison(b, a);
        var heap = new MinHeap<T>(worstAtRootComparison, k);

        for (int i = 0; i < source.Count; i++)
        {
            T candidate = source[i];
            if (heap.Count < k)
            {
                heap.Insert(candidate);
            }
            else if (betterFirstComparison(candidate, heap.PeekMin()) < 0)
            {
                heap.ReplaceRoot(candidate);
            }
        }

        var result = new T[heap.Count];
        for (int i = result.Length - 1; i >= 0; i--)
        {
            result[i] = heap.ExtractMin();
        }
        return result;
    }

    private void EnsureCapacity(int required)
    {
        if (required <= _items.Length)
        {
            return;
        }

        int newCapacity = _items.Length * 2;
        if (newCapacity < required)
        {
            newCapacity = required;
        }

        var next = new T[newCapacity];
        for (int i = 0; i < _count; i++)
        {
            next[i] = _items[i];
        }
        _items = next;
    }
}
