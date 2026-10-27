using ProLink.Engine.Algorithms;
using ProLink.Engine.Search;
using ProLink.Engine.Structures;

namespace ProLink.Engine.Admin;

public sealed record UserSearchEntry(
    string Id,
    string DisplayName,
    DateTimeOffset CreatedAt);

public sealed record UserSearchHit(
    string Id,
    string DisplayName,
    int MatchedTokens);

// Admin user directory search combining a Trie for prefix autocomplete and an InvertedIndex for multi-word lookup.
// Orders full-search results with MergeSort by matched token count descending, then recency descending, then display name.
// Complexity: Load is O(n * L), Suggest is O(L + limit), Search is O(P + m log m) where m is matching users.
public sealed class UserSearchIndex
{
    private readonly Trie _trie = new();
    private readonly InvertedIndex _invertedIndex = new();
    private readonly Dictionary<string, UserSearchEntry> _usersById = new();
    private readonly object _sync = new();

    public int Count
    {
        get
        {
            lock (_sync)
            {
                return _usersById.Count;
            }
        }
    }

    public void Load(IReadOnlyList<UserSearchEntry> users)
    {
        if (users is null)
        {
            throw new ArgumentNullException(nameof(users));
        }

        lock (_sync)
        {
            _trie.Clear();
            _invertedIndex.Clear();
            _usersById.Clear();

            for (int i = 0; i < users.Count; i++)
            {
                var user = users[i];
                if (string.IsNullOrWhiteSpace(user.Id) || string.IsNullOrWhiteSpace(user.DisplayName))
                {
                    continue;
                }

                _usersById[user.Id] = user;
                _trie.Insert(user.DisplayName, user.Id);
                _invertedIndex.Add(user.Id, user.DisplayName);
            }
        }
    }

    public UserSearchHit[] Suggest(string? prefix, int limit = 8)
    {
        int safeLimit = limit < 1 ? 1 : (limit > 25 ? 25 : limit);

        lock (_sync)
        {
            string[] ids = _trie.StartsWith(prefix ?? string.Empty, safeLimit);
            var hits = new List<UserSearchHit>(ids.Length);

            for (int i = 0; i < ids.Length; i++)
            {
                if (_usersById.TryGetValue(ids[i], out var entry))
                {
                    hits.Add(new UserSearchHit(entry.Id, entry.DisplayName, 1));
                }
            }

            var result = new UserSearchHit[hits.Count];
            for (int i = 0; i < hits.Count; i++)
            {
                result[i] = hits[i];
            }
            return result;
        }
    }

    public UserSearchHit[] Search(string? query)
    {
        lock (_sync)
        {
            string[] exactIntersectionIds = _invertedIndex.Search(query);
            var exactSet = new Dictionary<string, bool>(exactIntersectionIds.Length);
            for (int i = 0; i < exactIntersectionIds.Length; i++)
            {
                exactSet[exactIntersectionIds[i]] = true;
            }

            Dictionary<string, int> tokenCounts = _invertedIndex.CountTokenMatches(query);
            var candidates = new List<(UserSearchEntry Entry, int MatchedTokens, bool AllTokensMatched)>();

            foreach (var pair in tokenCounts)
            {
                if (_usersById.TryGetValue(pair.Key, out var entry))
                {
                    bool allMatched = exactSet.ContainsKey(pair.Key);
                    candidates.Add((entry, pair.Value, allMatched));
                }
            }

            if (candidates.Count == 0)
            {
                return Array.Empty<UserSearchHit>();
            }

            var comparer = MergeSort.ChainComparers<(UserSearchEntry Entry, int MatchedTokens, bool AllTokensMatched)>(
                (a, b) => b.AllTokensMatched.CompareTo(a.AllTokensMatched),
                (a, b) => b.MatchedTokens.CompareTo(a.MatchedTokens),
                (a, b) => b.Entry.CreatedAt.CompareTo(a.Entry.CreatedAt),
                (a, b) => string.Compare(a.Entry.DisplayName, b.Entry.DisplayName, StringComparison.OrdinalIgnoreCase));

            MergeSort.Sort(candidates, comparer);

            var results = new UserSearchHit[candidates.Count];
            for (int i = 0; i < candidates.Count; i++)
            {
                results[i] = new UserSearchHit(
                    candidates[i].Entry.Id,
                    candidates[i].Entry.DisplayName,
                    candidates[i].MatchedTokens);
            }
            return results;
        }
    }
}
