using ProLink.Engine.Structures;

namespace ProLink.Engine.Tests;

public sealed class StructuresTests
{
    [Fact]
    public void DoublyLinkedList_EmptyAndSingleElement_HandlesOperations()
    {
        var list = new DoublyLinkedList<int>();
        Assert.Equal(0, list.Count);
        Assert.Null(list.First);
        Assert.Null(list.Last);
        Assert.Null(list.RemoveLast());

        var node = list.AddFirst(42);
        Assert.Equal(1, list.Count);
        Assert.Same(node, list.First);
        Assert.Same(node, list.Last);

        list.MoveToFront(node);
        Assert.Equal(1, list.Count);
        Assert.Same(node, list.First);

        list.Remove(node);
        Assert.Equal(0, list.Count);
        Assert.Null(list.First);
        Assert.Null(list.Last);
    }

    [Fact]
    public void DoublyLinkedList_MoveToFrontAndRemove_MatchesReferenceOrder()
    {
        var list = new DoublyLinkedList<string>();
        var n1 = list.AddFirst("a");
        var n2 = list.AddFirst("b");
        var n3 = list.AddFirst("c");

        Assert.Equal(3, list.Count);
        Assert.Equal("c", list.First!.Value);
        Assert.Equal("a", list.Last!.Value);

        list.MoveToFront(n1);
        Assert.Equal("a", list.First!.Value);
        Assert.Equal("b", list.Last!.Value);

        list.MoveToFront(n3);
        Assert.Equal("c", list.First!.Value);

        var last = list.RemoveLast();
        Assert.NotNull(last);
        Assert.Equal("b", last!.Value);
        Assert.Equal(2, list.Count);

        list.Clear();
        Assert.Equal(0, list.Count);
        Assert.Null(list.First);
        Assert.Throws<InvalidOperationException>(() => list.Remove(n2));
    }

    [Fact]
    public void RingQueue_EmptySingleAndWraparoundGrowth_MatchesStandardQueue()
    {
        var ring = new RingQueue<int>(2);
        Assert.Equal(0, ring.Count);
        Assert.Throws<InvalidOperationException>(() => ring.Peek());
        Assert.Throws<InvalidOperationException>(() => ring.Dequeue());

        ring.Enqueue(10);
        Assert.Equal(1, ring.Count);
        Assert.Equal(10, ring.Peek());
        Assert.Equal(10, ring.Dequeue());
        Assert.Equal(0, ring.Count);

        var rng = new Random(12345);
        var reference = new List<int>();

        for (int step = 0; step < 500; step++)
        {
            if (reference.Count == 0 || rng.NextDouble() < 0.65)
            {
                int val = rng.Next(-1000, 1000);
                ring.Enqueue(val);
                reference.Add(val);
            }
            else
            {
                Assert.Equal(reference[0], ring.Peek());
                int actual = ring.Dequeue();
                int expected = reference[0];
                reference.RemoveAt(0);
                Assert.Equal(expected, actual);
            }

            Assert.Equal(reference.Count, ring.Count);
        }

        ring.Clear();
        Assert.Equal(0, ring.Count);
    }

    [Fact]
    public void GrowableArray_AddInsertAndIndex_WorksOnEdgeCases()
    {
        var arr = new GrowableArray<int>(1);
        Assert.Equal(0, arr.Count);
        Assert.Throws<ArgumentOutOfRangeException>(() => _ = arr[0]);

        arr.Add(10);
        arr.InsertAt(0, 5);
        arr.InsertAt(2, 20);
        arr.InsertAt(2, 15);

        Assert.Equal(new[] { 5, 10, 15, 20 }, arr.ToArray());
        arr[1] = 12;
        Assert.Equal(12, arr[1]);
    }

    [Fact]
    public void MinHeap_EmptySingleAndRandomized_MatchesSortedOrder()
    {
        var heap = new MinHeap<int>((a, b) => a.CompareTo(b), 2);
        Assert.Equal(0, heap.Count);
        Assert.Throws<InvalidOperationException>(() => heap.PeekMin());
        Assert.Throws<InvalidOperationException>(() => heap.ExtractMin());

        heap.Insert(99);
        Assert.Equal(99, heap.PeekMin());
        Assert.Equal(99, heap.ExtractMin());
        Assert.Equal(0, heap.Count);

        var rng = new Random(42);
        var expected = new List<int>();
        for (int i = 0; i < 300; i++)
        {
            int v = rng.Next(-5000, 5000);
            heap.Insert(v);
            expected.Add(v);
        }

        expected.Sort();
        for (int i = 0; i < expected.Count; i++)
        {
            Assert.Equal(expected[i], heap.ExtractMin());
        }
        Assert.Equal(0, heap.Count);
    }

    [Fact]
    public void MinHeap_TopK_SelectsBestKItemsComparedWithNaiveSort()
    {
        Assert.Empty(MinHeap<int>.TopK(Array.Empty<int>(), 5, (a, b) => b.CompareTo(a)));
        Assert.Empty(MinHeap<int>.TopK(new[] { 1, 2, 3 }, 0, (a, b) => b.CompareTo(a)));

        var single = MinHeap<int>.TopK(new[] { 7 }, 3, (a, b) => b.CompareTo(a));
        Assert.Equal(new[] { 7 }, single);

        var rng = new Random(99);
        var input = new List<int>();
        for (int i = 0; i < 250; i++)
        {
            input.Add(rng.Next(1, 10000));
        }

        // Better item = larger integer (b.CompareTo(a) < 0 when a > b)
        int[] top10 = MinHeap<int>.TopK(input, 10, (a, b) => b.CompareTo(a));
        int[] expectedTop10 = input.OrderByDescending(x => x).Take(10).ToArray();

        Assert.Equal(expectedTop10, top10);
    }

    [Fact]
    public void IndexedPriorityQueue_InsertUpdateRemove_MatchesReferenceBehavior()
    {
        var ipq = new IndexedPriorityQueue<string, int>((a, b) => a.CompareTo(b), 2);
        Assert.Equal(0, ipq.Count);
        Assert.False(ipq.Remove("missing"));
        Assert.Throws<InvalidOperationException>(() => ipq.PeekMin());
        Assert.Throws<InvalidOperationException>(() => ipq.ExtractMin());

        ipq.Insert("k1", 50);
        Assert.True(ipq.Contains("k1"));
        Assert.True(ipq.TryGetPriority("k1", out int p1) && p1 == 50);
        Assert.Throws<InvalidOperationException>(() => ipq.Insert("k1", 10));

        ipq.Insert("k2", 30);
        ipq.Insert("k3", 70);
        ipq.Insert("k4", 40);

        ipq.UpdatePriority("k3", 10);
        Assert.Equal("k3", ipq.PeekMin().Key);

        ipq.UpdatePriority("k3", 90);
        Assert.Equal("k2", ipq.PeekMin().Key);

        Assert.True(ipq.Remove("k2"));
        Assert.Equal("k4", ipq.ExtractMin().Key);
        Assert.Equal("k1", ipq.ExtractMin().Key);
        Assert.Equal("k3", ipq.ExtractMin().Key);
        Assert.Equal(0, ipq.Count);

        var rng = new Random(2026);
        var dict = new Dictionary<string, int>();
        for (int i = 0; i < 200; i++)
        {
            string key = "item-" + rng.Next(0, 60);
            int priority = rng.Next(1, 1000);

            if (!dict.ContainsKey(key))
            {
                dict[key] = priority;
                ipq.Insert(key, priority);
            }
            else if (rng.NextDouble() < 0.7)
            {
                dict[key] = priority;
                ipq.UpdatePriority(key, priority);
            }
            else
            {
                dict.Remove(key);
                Assert.True(ipq.Remove(key));
            }
        }

        int prevPriority = int.MinValue;
        while (ipq.Count > 0)
        {
            var min = ipq.ExtractMin();
            Assert.True(min.Priority >= prevPriority);
            prevPriority = min.Priority;
            dict.Remove(min.Key);
        }
        Assert.Empty(dict);
    }

    [Fact]
    public void LruCache_And_TtlLruCache_EvictsLeastRecentlyUsedAndExpiredItems()
    {
        var cache = new LruCache<string, int>(2);
        Assert.False(cache.TryGet("a", out _));

        cache.Put("a", 1);
        cache.Put("b", 2);
        Assert.True(cache.TryGet("a", out int valA) && valA == 1);

        // "b" is now least recently used; inserting "c" must evict "b"
        cache.Put("c", 3);
        Assert.False(cache.TryGet("b", out _));
        Assert.True(cache.TryGet("a", out _));
        Assert.True(cache.TryGet("c", out _));

        cache.Put("a", 10);
        Assert.True(cache.TryGet("a", out int updatedA) && updatedA == 10);
        Assert.True(cache.Remove("a"));
        Assert.False(cache.Remove("a"));

        var clock = new FakeClock();
        var ttlCache = new TtlLruCache<string, string>(4, TimeSpan.FromSeconds(30), clock);
        ttlCache.Put("role:1", "admin");
        Assert.True(ttlCache.TryGet("role:1", out string role) && role == "admin");

        clock.Advance(TimeSpan.FromSeconds(31));
        Assert.False(ttlCache.TryGet("role:1", out _));
        Assert.Equal(0, ttlCache.Count);
    }

    [Fact]
    public void Trie_InsertAndStartsWith_NormalizesCaseAndRespectsLimit()
    {
        var trie = new Trie();
        Assert.Empty(trie.StartsWith("a", 5));

        trie.Insert("  Demo Ahmed Khan  ", "u1");
        trie.Insert("DemoAyesha", "u2");
        trie.Insert("Demo Bilal Khan", "u3");

        string[] demoMatches = trie.StartsWith("DEMO", 2);
        Assert.Equal(2, demoMatches.Length);

        string[] khanMatches = trie.StartsWith("khan", 10);
        Assert.Contains("u1", khanMatches);
        Assert.Contains("u3", khanMatches);
    }
}
