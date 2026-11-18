namespace ProLink.Api.Models;

public sealed record SubmitOfferRequest(
    decimal Price,
    decimal? InspectionFee,
    int EtaMinutes,
    string? Message);

public sealed record UpdateOfferRequest(
    decimal Price,
    decimal? InspectionFee,
    int EtaMinutes,
    string? Message);

public sealed record MarkDoneRequest(string? Note);

public sealed record ProfessionalOfferRecord(
    Guid Id,
    Guid JobId,
    Guid ProfessionalId,
    decimal Price,
    decimal InspectionFee,
    int EtaMinutes,
    string? Message,
    string Status,
    string JobStatus,
    DateTimeOffset? JobExpiresAt,
    Guid JobCustomerId,
    string JobTitle,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
