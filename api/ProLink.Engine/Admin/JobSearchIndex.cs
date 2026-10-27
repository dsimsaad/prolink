using ProLink.Engine.Algorithms;
using ProLink.Engine.Search;

namespace ProLink.Engine.Admin;

public sealed record JobSearchEntry(
    string Id,
    string Title,
    string Description,
    DateTimeOffset CreatedAt);

// Full-text inverted index over marketplace job titles and descriptions.
// Uses InvertedIndex for token posting intersections and MergeSort to rank matches by token hits then recency.
// Complexity: Load is O(N * T log N); Search is O(P + m log m) where m is matching jobs.
public sealed class JobSearchIndex
{
    private readonly InvertedIndex _invertedIndex = new();
    private readonly Dictionary<string, JobSearchEntry> _jobsById = new();
    private readonly object _sync = new();

    public int Count
    {
        get
        {
            lock (_sync)
            {
                return _jobsById.Count;
            }
        }
    }

    public void Load(IReadOnlyList<JobSearchEntry> jobs)
    {
        if (jobs is null)
        {
            throw new ArgumentNullException(nameof(jobs));
        }

        lock (_sync)
        {
            _invertedIndex.Clear();
            _jobsById.Clear();

            for (int i = 0; i < jobs.Count; i++)
            {
                var job = jobs[i];
                if (string.IsNullOrWhiteSpace(job.Id))
                {
                    continue;
                }

                _jobsById[job.Id] = job;
                string combinedText = (job.Title ?? string.Empty) + " " + (job.Description ?? string.Empty);
                _invertedIndex.Add(job.Id, combinedText);
            }
        }
    }

    public string[] Search(string? query)
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
            var candidates = new List<(JobSearchEntry Entry, int MatchedTokens, bool AllTokensMatched)>();

            foreach (var pair in tokenCounts)
            {
                if (_jobsById.TryGetValue(pair.Key, out var entry))
                {
                    bool allMatched = exactSet.ContainsKey(pair.Key);
                    candidates.Add((entry, pair.Value, allMatched));
                }
            }

            if (candidates.Count == 0)
            {
                return Array.Empty<string>();
            }

            var comparer = MergeSort.ChainComparers<(JobSearchEntry Entry, int MatchedTokens, bool AllTokensMatched)>(
                (a, b) => b.AllTokensMatched.CompareTo(a.AllTokensMatched),
                (a, b) => b.MatchedTokens.CompareTo(a.MatchedTokens),
                (a, b) => b.Entry.CreatedAt.CompareTo(a.Entry.CreatedAt),
                (a, b) => string.CompareOrdinal(a.Entry.Id, b.Entry.Id));

            MergeSort.Sort(candidates, comparer);

            var ids = new string[candidates.Count];
            for (int i = 0; i < candidates.Count; i++)
            {
                ids[i] = candidates[i].Entry.Id;
            }
            return ids;
        }
    }
}
