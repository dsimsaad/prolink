using ProLink.Api.Models;
using ProLink.Engine.Admin;

namespace ProLink.Api.Data;

public interface IAdminRepository
{
    Task<AdminAuthRecord?> GetUserAuthRecordAsync(Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<PendingApplicationRecord>> GetPendingApplicationsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<OpenReportRecord>> GetOpenReportsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<DisputedJobRecord>> GetDisputedJobsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<AuditEntry>> GetRecentAuditEntriesAsync(int maxRows = 5000, CancellationToken ct = default);
    Task<IReadOnlyList<UserSearchEntry>> GetAllUsersForSearchAsync(CancellationToken ct = default);
    Task<IReadOnlyList<JobSearchEntry>> GetAllJobsForSearchAsync(CancellationToken ct = default);
    Task<IReadOnlyList<GroupJobCountRecord>> GetCategoryJobCountsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<GroupJobCountRecord>> GetAreaJobCountsAsync(CancellationToken ct = default);
    Task<FunnelCountsRecord> GetFunnelCountsAsync(CancellationToken ct = default);
    Task<JobStatusRecord?> GetJobStatusAsync(Guid jobId, CancellationToken ct = default);

    Task TransitionJobWithAuditAsync(
        Guid jobId,
        string fromStatus,
        string toStatus,
        Guid adminId,
        string note,
        string auditAction,
        string auditDetailsJson,
        CancellationToken ct = default);
}
