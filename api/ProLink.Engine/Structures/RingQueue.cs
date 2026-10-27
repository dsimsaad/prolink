namespace ProLink.Engine.Structures;

// Array-backed circular FIFO queue that wraps head and tail indices around the buffer and doubles when full.
// Needed by SlidingWindowLimiter to store per-client request timestamps and evict expired timestamps from the front.
// Complexity: Enqueue is O(1) amortized, Dequeue is O(1), Peek is O(1), Count is O(1).
public sealed class RingQueue<T>
{
    private T[] _buffer;
    private int _head;
    private int _tail;
    private int _count;

    public RingQueue(int initialCapacity = 8)
    {
        int capacity = initialCapacity < 1 ? 8 : initialCapacity;
        _buffer = new T[capacity];
        _head = 0;
        _tail = 0;
        _count = 0;
    }

    public int Count => _count;
    public int Capacity => _buffer.Length;

    public void Enqueue(T item)
    {
        if (_count == _buffer.Length)
        {
            Grow();
        }

        _buffer[_tail] = item;
        _tail = (_tail + 1) % _buffer.Length;
        _count++;
    }

    public T Dequeue()
    {
        if (_count == 0)
        {
            throw new InvalidOperationException("Cannot dequeue from an empty RingQueue.");
        }

        T value = _buffer[_head];
        _buffer[_head] = default!;
        _head = (_head + 1) % _buffer.Length;
        _count--;
        return value;
    }

    public T Peek()
    {
        if (_count == 0)
        {
            throw new InvalidOperationException("Cannot peek an empty RingQueue.");
        }

        return _buffer[_head];
    }

    public void Clear()
    {
        for (int i = 0; i < _buffer.Length; i++)
        {
            _buffer[i] = default!;
        }
        _head = 0;
        _tail = 0;
        _count = 0;
    }

    private void Grow()
    {
        int newCapacity = _buffer.Length * 2;
        var next = new T[newCapacity];

        for (int i = 0; i < _count; i++)
        {
            int index = (_head + i) % _buffer.Length;
            next[i] = _buffer[index];
        }

        _buffer = next;
        _head = 0;
        _tail = _count;
    }
}
