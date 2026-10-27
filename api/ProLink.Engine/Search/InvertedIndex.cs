using ProLink.Engine.Algorithms;
using ProLink.Engine.Structures;

namespace ProLink.Engine.Search;

// Inverted index mapping each normalized token to a sorted GrowableArray of document IDs.
// Needed by both UserSearchIndex (user names) and JobSearchIndex (job titles and descriptions).
// Complexity: Add is O(T * log P + P) per document; Search intersects sorted posting lists with a two-pointer merge in O(sum of posting list lengths).
public sealed class InvertedIndex
{
    private readonly Dictionary<string, GrowableArray<string>> _postings = new();

    public int TokenCount => _postings.Count;

    public void Add(string id, string? text)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return;
        }

        string[] tokens = TextNormalizer.Tokenize(text);
        for (int i = 0; i < tokens.Length; i++)
        {
            string token = tokens[i];
            if (!_postings.TryGetValue(token, out var list))
            {
                list = new GrowableArray<string>();
                _postings[token] = list;
            }

            InsertSortedUnique(list, id);
        }
    }

    // Intersects the posting lists for all tokens in the query using a two-pointer merge, starting from the shortest posting list.
    public string[] Search(string? query)
    {
        string[] rawTokens = TextNormalizer.Tokenize(query);
        if (rawTokens.Length == 0)
        {
            return Array.Empty<string>();
        }

        var uniqueTokens = DeduplicateTokens(rawTokens);
        var lists = new GrowableArray<string>[uniqueTokens.Length];

        for (int i = 0; i < uniqueTokens.Length; i++)
        {
            if (!_postings.TryGetValue(uniqueTokens[i], out var posting) || posting.Count == 0)
            {
                return Array.Empty<string>();
            }
            lists[i] = posting;
        }

        // Order posting lists from shortest to longest so intermediate intersections shrink as early as possible
        MergeSort.Sort(lists, (a, b) => a.Count.CompareTo(b.Count));

        string[] current = lists[0].ToArray();
        for (int i = 1; i < lists.Length && current.Length > 0; i++)
        {
            current = IntersectTwoSorted(current, lists[i]);
        }

        return current;
    }

    // Counts how many distinct query tokens appear in each matching document for multi-keyword ranking.
    public Dictionary<string, int> CountTokenMatches(string? query)
    {
        var counts = new Dictionary<string, int>();
        string[] rawTokens = TextNormalizer.Tokenize(query);
        if (rawTokens.Length == 0)
        {
            return counts;
        }

        string[] uniqueTokens = DeduplicateTokens(rawTokens);
        for (int i = 0; i < uniqueTokens.Length; i++)
        {
            if (!_postings.TryGetValue(uniqueTokens[i], out var posting))
            {
                continue;
            }

            for (int j = 0; j < posting.Count; j++)
            {
                string docId = posting[j];
                if (counts.TryGetValue(docId, out int existing))
                {
                    counts[docId] = existing + 1;
                }
                else
                {
                    counts[docId] = 1;
                }
            }
        }

        return counts;
    }

    public void Clear() => _postings.Clear();

    private static void InsertSortedUnique(GrowableArray<string> list, string id)
    {
        int low = 0;
        int high = list.Count;

        while (low < high)
        {
            int mid = low + ((high - low) / 2);
            int cmp = string.CompareOrdinal(list[mid], id);
            if (cmp == 0)
            {
                return;
            }
            if (cmp < 0)
            {
                low = mid + 1;
            }
            else
            {
                high = mid;
            }
        }

        list.InsertAt(low, id);
    }

    private static string[] IntersectTwoSorted(string[] left, GrowableArray<string> right)
    {
        var matched = new List<string>();
        int i = 0;
        int j = 0;

        while (i < left.Length && j < right.Count)
        {
            int cmp = string.CompareOrdinal(left[i], right[j]);
            if (cmp == 0)
            {
                matched.Add(left[i]);
                i++;
                j++;
            }
            else if (cmp < 0)
            {
                i++;
            }
            else
            {
                j++;
            }
        }

        var result = new string[matched.Count];
        for (int k = 0; k < matched.Count; k++)
        {
            result[k] = matched[k];
        }
        return result;
    }

    private static string[] DeduplicateTokens(string[] tokens)
    {
        var seen = new Dictionary<string, bool>(tokens.Length);
        var unique = new List<string>(tokens.Length);

        for (int i = 0; i < tokens.Length; i++)
        {
            if (!seen.ContainsKey(tokens[i]))
            {
                seen[tokens[i]] = true;
                unique.Add(tokens[i]);
            }
        }

        var result = new string[unique.Count];
        for (int i = 0; i < unique.Count; i++)
        {
            result[i] = unique[i];
        }
        return result;
    }
}
