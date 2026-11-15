using ProLink.Api.Data;
using ProLink.Api.Models;

namespace ProLink.Api.Services;

public interface IJobMatcher
{
    Task<int> NotifyMatchingProfessionalsAsync(CustomerJobRecord job, CancellationToken ct = default);
}

// Simple database-backed fallback matcher that notifies up to 5 approved, available, non-suspended
// professionals who serve the job's category and area (excluding the customer who posted the job).
// Urgent jobs are prioritized first when ordering match notifications.
// The DSA-based graph and priority-queue matcher will replace this implementation later.
public sealed class FallbackMatcher : IJobMatcher
{
    private const int MaxMatchedProfessionals = 5;
    private readonly IAdminRepository _repository;

    public FallbackMatcher(IAdminRepository repository)
    {
        _repository = repository;
    }

    public async Task<int> NotifyMatchingProfessionalsAsync(CustomerJobRecord job, CancellationToken ct = default)
    {
        var jobsToNotify = OrderByUrgencyFirst(new[] { job });
        int totalNotified = 0;

        for (int i = 0; i < jobsToNotify.Count; i++)
        {
            var current = jobsToNotify[i];
            var matchedIds = await _repository.FindMatchingProfessionalsAsync(
                current.CategoryId,
                current.AreaId,
                current.CustomerId,
                MaxMatchedProfessionals,
                ct);

            if (matchedIds.Count > 0)
            {
                await _repository.InsertJobMatchNotificationsAsync(
                    current.Id,
                    current.Title,
                    current.Urgency,
                    matchedIds,
                    ct);
                totalNotified += matchedIds.Count;
            }
        }

        return totalNotified;
    }

    public static IReadOnlyList<CustomerJobRecord> OrderByUrgencyFirst(IEnumerable<CustomerJobRecord> jobs)
    {
        var urgent = new List<CustomerJobRecord>();
        var normal = new List<CustomerJobRecord>();

        foreach (var job in jobs)
        {
            if (string.Equals(job.Urgency, "urgent", StringComparison.OrdinalIgnoreCase))
            {
                urgent.Add(job);
            }
            else
            {
                normal.Add(job);
            }
        }

        urgent.AddRange(normal);
        return urgent;
    }
}
