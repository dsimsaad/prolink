using ProLink.Engine.Search;

namespace ProLink.Engine.Structures;

// Prefix tree where each node maps characters to child nodes and stores matching entity IDs.
// Needed by UserSearchIndex to provide fast prefix autocomplete as an admin types a user's name.
// Complexity: Insert is O(L), StartsWith is O(L + V) where L is prefix length and V is visited subtree size up to limit.
public sealed class Trie
{
    private sealed class TrieNode
    {
        public readonly Dictionary<char, TrieNode> Children = new();
        public readonly List<string> Ids = new();
    }

    private readonly TrieNode _root = new();

    public void Insert(string text, string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return;
        }

        string normalized = TextNormalizer.Normalize(text);
        if (normalized.Length == 0)
        {
            return;
        }

        InsertString(normalized, id);

        // Also index individual word tokens so typing a last name suggests the user too
        string[] tokens = TextNormalizer.Tokenize(normalized);
        for (int i = 0; i < tokens.Length; i++)
        {
            if (tokens[i] != normalized)
            {
                InsertString(tokens[i], id);
            }
        }
    }

    public string[] StartsWith(string prefix, int limit = 8)
    {
        if (limit <= 0)
        {
            return Array.Empty<string>();
        }

        string normalized = TextNormalizer.Normalize(prefix);
        if (normalized.Length == 0)
        {
            return Array.Empty<string>();
        }

        TrieNode? current = _root;
        for (int i = 0; i < normalized.Length; i++)
        {
            char c = normalized[i];
            if (!current.Children.TryGetValue(c, out current))
            {
                return Array.Empty<string>();
            }
        }

        var results = new List<string>();
        var seen = new Dictionary<string, bool>();
        CollectSubtree(current, limit, results, seen);

        var array = new string[results.Count];
        for (int i = 0; i < results.Count; i++)
        {
            array[i] = results[i];
        }
        return array;
    }

    public void Clear()
    {
        _root.Children.Clear();
        _root.Ids.Clear();
    }

    private void InsertString(string value, string id)
    {
        TrieNode current = _root;
        for (int i = 0; i < value.Length; i++)
        {
            char c = value[i];
            if (!current.Children.TryGetValue(c, out TrieNode? next))
            {
                next = new TrieNode();
                current.Children[c] = next;
            }
            current = next;
        }

        for (int i = 0; i < current.Ids.Count; i++)
        {
            if (current.Ids[i] == id)
            {
                return;
            }
        }
        current.Ids.Add(id);
    }

    private static void CollectSubtree(
        TrieNode node,
        int limit,
        List<string> results,
        Dictionary<string, bool> seen)
    {
        for (int i = 0; i < node.Ids.Count && results.Count < limit; i++)
        {
            string id = node.Ids[i];
            if (!seen.ContainsKey(id))
            {
                seen[id] = true;
                results.Add(id);
            }
        }

        if (results.Count >= limit)
        {
            return;
        }

        foreach (var pair in node.Children)
        {
            CollectSubtree(pair.Value, limit, results, seen);
            if (results.Count >= limit)
            {
                return;
            }
        }
    }
}
