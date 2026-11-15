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

    Task<bool> IsActiveCategoryAsync(long categoryId, CancellationToken ct = default);
    Task<bool> AreaExistsAsync(long areaId, CancellationToken ct = default);
    Task<IReadOnlyList<ActiveCategoryRecord>> GetActiveCategoriesAsync(CancellationToken ct = default);
    Task<CustomerJobRecord?> GetCustomerJobAsync(Guid jobId, Guid customerId, CancellationToken ct = default);

    Task<CustomerJobRecord> CreateCustomerJobAsync(
        Guid customerId,
        string title,
        string description,
        long categoryId,
        long areaId,
        decimal? budgetMin,
        decimal? budgetMax,
        string urgency,
        bool publish,
        DateTimeOffset? expiresAt,
        CancellationToken ct = default);

    Task<CustomerJobRecord> UpdateDraftJobAsync(
        Guid jobId,
        Guid customerId,
        string title,
        string description,
        long categoryId,
        long areaId,
        decimal? budgetMin,
        decimal? budgetMax,
        string urgency,
        CancellationToken ct = default);

    Task<CustomerJobRecord> PublishCustomerJobAsync(
        Guid jobId,
        Guid customerId,
        DateTimeOffset expiresAt,
        CancellationToken ct = default);

    Task<CustomerJobRecord> CancelCustomerJobAsync(
        Guid jobId,
        Guid customerId,
        string fromStatus,
        Guid? assignedProfessionalId,
        string jobTitle,
        string? reason,
        CancellationToken ct = default);

    Task<JobOfferRecord?> GetJobOfferAsync(Guid jobId, Guid offerId, CancellationToken ct = default);

    Task<AcceptOfferResult> AcceptOfferAsync(
        Guid jobId,
        Guid customerId,
        string fromStatus,
        string jobTitle,
        Guid offerId,
        Guid professionalId,
        CancellationToken ct = default);

    Task<CustomerJobRecord> CompleteCustomerJobAsync(
        Guid jobId,
        Guid customerId,
        Guid? assignedProfessionalId,
        string jobTitle,
        CancellationToken ct = default);

    Task<CustomerJobRecord> DisputeCustomerJobAsync(
        Guid jobId,
        Guid customerId,
        string fromStatus,
        Guid? assignedProfessionalId,
        string jobTitle,
        string reason,
        CancellationToken ct = default);

    Task<bool> HasReviewForJobAsync(Guid jobId, CancellationToken ct = default);

    Task<ReviewRecord> CreateReviewAsync(
        Guid jobId,
        Guid reviewerId,
        Guid professionalId,
        int rating,
        string? comment,
        CancellationToken ct = default);

    Task<IReadOnlyList<Guid>> FindMatchingProfessionalsAsync(
        long categoryId,
        long areaId,
        Guid excludeCustomerId,
        int limit,
        CancellationToken ct = default);

    Task InsertJobMatchNotificationsAsync(
        Guid jobId,
        string jobTitle,
        string urgency,
        IReadOnlyList<Guid> professionalIds,
        CancellationToken ct = default);
}
