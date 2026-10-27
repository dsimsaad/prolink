namespace ProLink.Engine.Structures;

// Doubly-linked list node holding prev/next pointers so nodes can be detached or moved in constant time.
public sealed class DoublyLinkedNode<T>
{
    public DoublyLinkedNode(T value)
    {
        Value = value;
    }

    public T Value { get; set; }
    public DoublyLinkedNode<T>? Prev { get; internal set; }
    public DoublyLinkedNode<T>? Next { get; internal set; }
    internal DoublyLinkedList<T>? Owner { get; set; }
}

// Custom doubly-linked list supporting constant-time insertion at the head, arbitrary node removal, and promotion to the head.
// Needed by LruCache to track access recency and evict the least recently used entry without scanning.
// Complexity: AddFirst is O(1), Remove(node) is O(1), MoveToFront(node) is O(1), RemoveLast is O(1).
public sealed class DoublyLinkedList<T>
{
    private DoublyLinkedNode<T>? _head;
    private DoublyLinkedNode<T>? _tail;
    private int _count;

    public int Count => _count;
    public DoublyLinkedNode<T>? First => _head;
    public DoublyLinkedNode<T>? Last => _tail;

    public DoublyLinkedNode<T> AddFirst(T value)
    {
        var node = new DoublyLinkedNode<T>(value) { Owner = this };
        AttachAtFront(node);
        _count++;
        return node;
    }

    public void Remove(DoublyLinkedNode<T> node)
    {
        if (node is null)
        {
            throw new ArgumentNullException(nameof(node));
        }
        if (!ReferenceEquals(node.Owner, this))
        {
            throw new InvalidOperationException("Node does not belong to this list.");
        }

        Detach(node);
        node.Owner = null;
        _count--;
    }

    public void MoveToFront(DoublyLinkedNode<T> node)
    {
        if (node is null)
        {
            throw new ArgumentNullException(nameof(node));
        }
        if (!ReferenceEquals(node.Owner, this))
        {
            throw new InvalidOperationException("Node does not belong to this list.");
        }
        if (ReferenceEquals(_head, node))
        {
            return;
        }

        Detach(node);
        AttachAtFront(node);
    }

    public DoublyLinkedNode<T>? RemoveLast()
    {
        if (_tail is null)
        {
            return null;
        }

        var removed = _tail;
        Remove(removed);
        return removed;
    }

    public void Clear()
    {
        var current = _head;
        while (current is not null)
        {
            var next = current.Next;
            current.Prev = null;
            current.Next = null;
            current.Owner = null;
            current = next;
        }

        _head = null;
        _tail = null;
        _count = 0;
    }

    private void AttachAtFront(DoublyLinkedNode<T> node)
    {
        node.Prev = null;
        node.Next = _head;

        if (_head is not null)
        {
            _head.Prev = node;
        }
        _head = node;

        if (_tail is null)
        {
            _tail = node;
        }
    }

    private void Detach(DoublyLinkedNode<T> node)
    {
        if (node.Prev is not null)
        {
            node.Prev.Next = node.Next;
        }
        else
        {
            _head = node.Next;
        }

        if (node.Next is not null)
        {
            node.Next.Prev = node.Prev;
        }
        else
        {
            _tail = node.Prev;
        }

        node.Prev = null;
        node.Next = null;
    }
}
