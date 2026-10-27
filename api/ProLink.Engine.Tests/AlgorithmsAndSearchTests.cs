using ProLink.Engine.Algorithms;
using ProLink.Engine.Search;

namespace ProLink.Engine.Tests;

public sealed class AlgorithmsAndSearchTests
{
    private sealed record SortItem(int PrimaryKey, int OriginalOrder);

    [Fact]
    public void MergeSort_EmptySingleAndRandomized_IsStableAndMatchesFrameworkSort()
    {
        int[] empty = Array.Empty<int>();
        MergeSort.Sort(empty, (a, b) => a.CompareTo(b));
        Assert.Empty(empty);

        int[] single = { 42 };
        MergeSort.Sort(single, (a, b) => a.CompareTo(b));
        Assert.Equal(new[] { 42 }, single);

        // Verify stability on duplicate keys
        var items = new List<SortItem>
        {
            new(2, 1),
            new(1, 2),
            new(2, 3),
            new(1, 4),
            new(2, 5),
        };

        MergeSort.Sort(items, (a, b) => a.PrimaryKey.CompareTo(b.PrimaryKey));
        Assert.Equal(new[] { 2, 4, 1, 3, 5 }, items.Select(x => x.OriginalOrder).ToArray());

        // Randomized test against framework OrderBy
        var rng = new Random(777);
        var randomPairs = new (int Count, string Name)[300];
        for (int i = 0; i < randomPairs.Length; i++)
        {
            randomPairs[i] = (rng.Next(0, 20), "name-" + rng.Next(0, 15));
        }

        var expected = randomPairs
            .OrderByDescending(x => x.Count)
            .ThenBy(x => x.Name, StringComparer.Ordinal)
            .ToArray();

        var chained = MergeSort.ChainComparers<(int Count, string Name)>(
            (a, b) => b.Count.CompareTo(a.Count),
            (a, b) => string.CompareOrdinal(a.Name, b.Name));

        MergeSort.Sort(randomPairs, chained);
        Assert.Equal(expected, randomPairs);
    }

    [Fact]
    public void BinarySearch_LowerBoundAndUpperBound_MatchesLinearScan()
    {
        int[] empty = Array.Empty<int>();
        Assert.Equal(0, BinarySearch.LowerBound(empty, 5, x => x, (a, b) => a.CompareTo(b)));
        Assert.Equal(0, BinarySearch.UpperBound(empty, 5, x => x, (a, b) => a.CompareTo(b)));

        int[] single = { 10 };
        Assert.Equal(0, BinarySearch.LowerBound(single, 5, x => x, (a, b) => a.CompareTo(b)));
        Assert.Equal(0, BinarySearch.LowerBound(single, 10, x => x, (a, b) => a.CompareTo(b)));
        Assert.Equal(1, BinarySearch.LowerBound(single, 15, x => x, (a, b) => a.CompareTo(b)));
        Assert.Equal(1, BinarySearch.UpperBound(single, 10, x => x, (a, b) => a.CompareTo(b)));

        var rng = new Random(31415);
        var values = new int[200];
        for (int i = 0; i < values.Length; i++)
        {
            values[i] = rng.Next(0, 40);
        }
        MergeSort.Sort(values, (a, b) => a.CompareTo(b));

        for (int target = -5; target <= 45; target++)
        {
            int lb = BinarySearch.LowerBound(values, target, x => x, (a, b) => a.CompareTo(b));
            int ub = BinarySearch.UpperBound(values, target, x => x, (a, b) => a.CompareTo(b));

            int expectedLb = values.TakeWhile(x => x < target).Count();
            int expectedUb = values.TakeWhile(x => x <= target).Count();

            Assert.Equal(expectedLb, lb);
            Assert.Equal(expectedUb, ub);
        }
    }

    [Fact]
    public void InvertedIndex_TwoPointerIntersection_MatchesNaiveSetIntersection()
    {
        var index = new InvertedIndex();
        Assert.Empty(index.Search(""));
        Assert.Empty(index.Search("plumbing"));

        index.Add("job-1", "Emergency kitchen pipe leak repair");
        index.Add("job-2", "Bathroom pipe leak and tap replacement");
        index.Add("job-3", "Split AC gas refill and leak check");
        index.Add("job-4", "Exterior wall painting");

        string[] pipeLeak = index.Search("PIPE leak");
        Assert.Equal(new[] { "job-1", "job-2" }, pipeLeak);

        string[] missingToken = index.Search("pipe solar");
        Assert.Empty(missingToken);

        var counts = index.CountTokenMatches("pipe leak kitchen");
        Assert.Equal(3, counts["job-1"]);
        Assert.Equal(2, counts["job-2"]);
        Assert.Equal(1, counts["job-3"]);

        // Randomized test comparing InvertedIndex.Search with naive token containment
        var rng = new Random(888);
        string[] vocab = { "plumbing", "wiring", "inverter", "leak", "painting", "carpentry", "urgent", "lahore" };
        var rawDocs = new Dictionary<string, HashSet<string>>();
        var randIndex = new InvertedIndex();

        for (int i = 0; i < 80; i++)
        {
            string docId = $"doc-{i:D3}";
            var words = new List<string>();
            for (int w = 0; w < 4; w++)
            {
                words.Add(vocab[rng.Next(vocab.Length)]);
            }
            string text = string.Join(" ", words);
            randIndex.Add(docId, text);
            rawDocs[docId] = words.ToHashSet(StringComparer.Ordinal);
        }

        for (int q = 0; q < 40; q++)
        {
            string w1 = vocab[rng.Next(vocab.Length)];
            string w2 = vocab[rng.Next(vocab.Length)];
            string query = $"{w1} {w2}";

            string[] actual = randIndex.Search(query);
            string[] expected = rawDocs
                .Where(kv => kv.Value.Contains(w1) && kv.Value.Contains(w2))
                .Select(kv => kv.Key)
                .OrderBy(k => k, StringComparer.Ordinal)
                .ToArray();

            Assert.Equal(expected, actual);
        }
    }
}
