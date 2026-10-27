namespace ProLink.Engine.Structures;

// Dynamic array backed by a raw T[] buffer that doubles when full.
// Needed by InvertedIndex posting lists to maintain sorted document IDs without framework collections.
// Complexity: Add is O(1) amortized, InsertAt is O(n), indexer is O(1).
public sealed class GrowableArray<T>
{
    private T[] _items;
    private int _count;

    public GrowableArray(int initialCapacity = 4)
    {
        int capacity = initialCapacity < 1 ? 4 : initialCapacity;
        _items = new T[capacity];
        _count = 0;
    }

    public int Count => _count;

    public T this[int index]
    {
        get
        {
            if (index < 0 || index >= _count)
            {
                throw new ArgumentOutOfRangeException(nameof(index));
            }
            return _items[index];
        }
        set
        {
            if (index < 0 || index >= _count)
            {
                throw new ArgumentOutOfRangeException(nameof(index));
            }
            _items[index] = value;
        }
    }

    public void Add(T item)
    {
        EnsureCapacity(_count + 1);
        _items[_count] = item;
        _count++;
    }

    public void InsertAt(int index, T item)
    {
        if (index < 0 || index > _count)
        {
            throw new ArgumentOutOfRangeException(nameof(index));
        }

        EnsureCapacity(_count + 1);
        for (int i = _count; i > index; i--)
        {
            _items[i] = _items[i - 1];
        }

        _items[index] = item;
        _count++;
    }

    public T[] ToArray()
    {
        var result = new T[_count];
        for (int i = 0; i < _count; i++)
        {
            result[i] = _items[i];
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
