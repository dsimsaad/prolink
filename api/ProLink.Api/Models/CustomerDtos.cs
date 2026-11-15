namespace ProLink.Api.Models;

public sealed record CreateJobRequest(
    string? Title,
    string? Description,
    long CategoryId,
    long AreaId,
    decimal? BudgetMin,
    decimal? BudgetMax,
    string? Urgency,
    bool Publish);

public sealed record UpdateDraftJobRequest(
    string? Title,
    string? Description,
    long CategoryId,
    long AreaId,
    decimal? BudgetMin,
    decimal? BudgetMax,
    string? Urgency);

public sealed record CancelJobRequest(string? Reason);

public sealed record DisputeJobRequest(string? Reason);

public sealed record CreateReviewRequest(int Rating, string? Comment);

public sealed record ActiveCategoryRecord(long Id, string Name);

public sealed record CustomerJobRecord(
    Guid Id,
    Guid CustomerId,
    string Title,
    string Description,
    long CategoryId,
    long AreaId,
    decimal? BudgetMin,
    decimal? BudgetMax,
    string Urgency,
    string Status,
    Guid? AssignedProfessionalId,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record JobOfferRecord(
    Guid Id,
    Guid JobId,
    Guid ProfessionalId,
    string Status,
    decimal Price,
    decimal InspectionFee,
    int EtaMinutes);

public sealed record AcceptOfferResult(
    Guid JobId,
    string PreviousStatus,
    string Status,
    Guid AcceptedOfferId,
    Guid AssignedProfessionalId,
    Guid ConversationId,
    IReadOnlyList<Guid> RejectedProfessionalIds,
    DateTimeOffset UpdatedAt);

public sealed record ReviewRecord(
    Guid Id,
    Guid JobId,
    Guid ReviewerId,
    Guid ProfessionalId,
    int Rating,
    string? Comment,
    DateTimeOffset CreatedAt);
