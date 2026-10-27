namespace ProLink.Api.Models;

public sealed record ApiErrorResponse(string Code, string Message);

public sealed record AdminAuthRecord(Guid UserId, string Role, bool IsSuspended);

public sealed record PendingApplicationRecord(
    Guid ProfileId,
    string FullName,
    int YearsExperience,
    DateTimeOffset AppliedAt);

public sealed record OpenReportRecord(
    Guid ReportId,
    string Reason,
    string Status,
    DateTimeOffset CreatedAt);

public sealed record DisputedJobRecord(
    Guid JobId,
    string Title,
    string AreaName,
    DateTimeOffset UpdatedAt);

public sealed record GroupJobCountRecord(
    long Id,
    string Name,
    int JobCount);

public sealed record FunnelCountsRecord(
    int Posted,
    int ReceivedOffers,
    int Assigned,
    int Completed);

public sealed record JobStatusRecord(
    Guid JobId,
    string Status);

public sealed record ForceCancelRequest(string? Reason);

public sealed record ResolveDisputeRequest(string? Outcome, string? Note);
