using System.Security.Claims;
using Npgsql;
using ProLink.Api.Auth;
using ProLink.Api.Data;
using ProLink.Api.Models;
using ProLink.Api.Services;
using ProLink.Engine.Abstractions;
using ProLink.Engine.Rules;

namespace ProLink.Api.Endpoints;

public static class ProfessionalEndpoints
{
    private const decimal MaxOfferPrice = 10_000_000m;
    private const decimal MaxInspectionFee = 100_000m;
    private const int MinEtaMinutes = 10;
    private const int MaxEtaMinutes = 10_080;
    private const int MaxMessageLength = 500;

    public static void MapProfessionalEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/pro").RequireAuthorization("ApprovedProfessional");

        group.MapPost("/jobs/{id}/offers", SubmitOfferAsync);
        group.MapPatch("/offers/{id}", UpdateOfferAsync);
        group.MapPost("/offers/{id}/withdraw", WithdrawOfferAsync);
        group.MapPost("/jobs/{id}/start", StartJobAsync);
        group.MapPost("/jobs/{id}/mark-done", MarkJobDoneAsync);
        group.MapPost("/jobs/{id}/dispute", DisputeJobAsync);
    }

    private static async Task<IResult> SubmitOfferAsync(
        string id,
        SubmitOfferRequest? request,
        HttpContext ctx,
        IAdminRepository repo,
        AdminRoleCache roleCache,
        AdminEngineService engine,
        IClock clock,
        CancellationToken ct)
    {
        if (!TryParseIdAndProfessional(id, "Job", ctx, out Guid jobId, out Guid proId, out IResult? idErr))
        {
            return idErr!;
        }

        var fieldError = ValidateOfferFields(
            request?.Price ?? 0m,
            request?.InspectionFee,
            request?.EtaMinutes ?? 0,
            request?.Message);
        if (fieldError is not null)
        {
            return fieldError;
        }

        var job = await repo.GetJobByIdAsync(jobId, ct);
        if (job is null || job.Status == JobStateMachine.Draft)
        {
            return NotFoundJob();
        }

        if (job.CustomerId == proId)
        {
            return Results.Conflict(new ApiErrorResponse(
                "own_job",
                "You cannot submit an offer on your own job posting."));
        }

        bool isBiddableStatus =
            job.Status == JobStateMachine.Open || job.Status == JobStateMachine.OffersReceived;
        bool isExpired = job.ExpiresAt.HasValue && job.ExpiresAt.Value <= clock.UtcNow;

        if (!isBiddableStatus || isExpired)
        {
            return Results.Conflict(new ApiErrorResponse(
                "job_closed",
                "This job is no longer open for new offers."));
        }

        if (!await repo.ProfessionalHasCategorySkillAsync(proId, job.CategoryId, ct))
        {
            return Results.Conflict(new ApiErrorResponse(
                "category_mismatch",
                "You can only submit offers on jobs in your approved trade categories."));
        }

        var existingOffer = await repo.GetProfessionalOfferForJobAsync(jobId, proId, ct);
        if (existingOffer is not null)
        {
            return Results.Conflict(new ApiErrorResponse(
                "duplicate_offer",
                "You have already submitted an offer for this job. Only one offer per job is allowed, and a withdrawn offer cannot be resubmitted."));
        }

        string targetJobStatus = job.Status;
        if (job.Status == JobStateMachine.Open)
        {
            if (!engine.StateMachine.CanTransition(JobStateMachine.Open, JobStateMachine.OffersReceived))
            {
                return ConflictTransition("Cannot transition job to Offers received.");
            }
            targetJobStatus = JobStateMachine.OffersReceived;
        }

        string proName = await ResolveProfessionalNameAsync(proId, repo, roleCache, ct);
        decimal fee = request!.InspectionFee ?? 0m;
        string? cleanMessage = string.IsNullOrWhiteSpace(request.Message)
            ? null
            : request.Message.Trim();

        try
        {
            var created = await repo.CreateProfessionalOfferAsync(
                jobId,
                proId,
                proName,
                job.CustomerId,
                job.Title,
                job.Status,
                targetJobStatus,
                request.Price,
                fee,
                request.EtaMinutes,
                cleanMessage,
                ct);

            engine.InvalidateAfterJobMutation(jobId);
            return Results.Created($"/pro/offers/{created.Id}", FormatOfferResponse(created));
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            return Results.Conflict(new ApiErrorResponse(
                "duplicate_offer",
                "You have already submitted an offer for this job. Only one offer per job is allowed, and a withdrawn offer cannot be resubmitted."));
        }
    }

    private static async Task<IResult> UpdateOfferAsync(
        string id,
        UpdateOfferRequest? request,
        HttpContext ctx,
        IAdminRepository repo,
        AdminEngineService engine,
        IClock clock,
        CancellationToken ct)
    {
        if (!TryParseIdAndProfessional(id, "Offer", ctx, out Guid offerId, out Guid proId, out IResult? idErr))
        {
            return idErr!;
        }

        var fieldError = ValidateOfferFields(
            request?.Price ?? 0m,
            request?.InspectionFee,
            request?.EtaMinutes ?? 0,
            request?.Message);
        if (fieldError is not null)
        {
            return fieldError;
        }

        var existing = await repo.GetProfessionalOfferByIdAsync(offerId, proId, ct);
        if (existing is null)
        {
            return NotFoundOffer();
        }

        if (!string.Equals(existing.Status, "pending", StringComparison.OrdinalIgnoreCase))
        {
            return Results.Conflict(new ApiErrorResponse(
                "offer_not_pending",
                "Only a pending offer can be edited."));
        }

        bool jobOpen =
            existing.JobStatus == JobStateMachine.Open || existing.JobStatus == JobStateMachine.OffersReceived;
        bool expired = existing.JobExpiresAt.HasValue && existing.JobExpiresAt.Value <= clock.UtcNow;

        if (!jobOpen || expired)
        {
            return Results.Conflict(new ApiErrorResponse(
                "job_closed",
                "Cannot edit an offer because the job is no longer open for offers."));
        }

        decimal fee = request!.InspectionFee ?? 0m;
        string? cleanMessage = string.IsNullOrWhiteSpace(request.Message)
            ? null
            : request.Message.Trim();

        var updated = await repo.UpdateProfessionalOfferAsync(
            offerId,
            existing.JobId,
            proId,
            existing.JobStatus,
            request.Price,
            fee,
            request.EtaMinutes,
            cleanMessage,
            ct);

        engine.InvalidateAfterJobMutation(existing.JobId);
        return Results.Ok(FormatOfferResponse(updated));
    }

    private static async Task<IResult> WithdrawOfferAsync(
        string id,
        HttpContext ctx,
        IAdminRepository repo,
        AdminEngineService engine,
        CancellationToken ct)
    {
        if (!TryParseIdAndProfessional(id, "Offer", ctx, out Guid offerId, out Guid proId, out IResult? idErr))
        {
            return idErr!;
        }

        var existing = await repo.GetProfessionalOfferByIdAsync(offerId, proId, ct);
        if (existing is null)
        {
            return NotFoundOffer();
        }

        if (!string.Equals(existing.Status, "pending", StringComparison.OrdinalIgnoreCase))
        {
            return Results.Conflict(new ApiErrorResponse(
                "offer_not_pending",
                "Only a pending offer can be withdrawn. A withdrawn offer cannot be resubmitted because only one offer per job per professional is allowed."));
        }

        bool jobOpen =
            existing.JobStatus == JobStateMachine.Open || existing.JobStatus == JobStateMachine.OffersReceived;
        if (!jobOpen)
        {
            return ConflictTransition("Cannot withdraw an offer when the job is no longer open.");
        }

        var withdrawn = await repo.WithdrawProfessionalOfferAsync(
            offerId,
            existing.JobId,
            proId,
            existing.JobStatus,
            ct);

        engine.InvalidateAfterJobMutation(existing.JobId);
        return Results.Ok(new
        {
            id = withdrawn.Id,
            jobId = withdrawn.JobId,
            previousStatus = existing.Status,
            status = withdrawn.Status,
            updatedAt = withdrawn.UpdatedAt,
        });
    }

    private static async Task<IResult> StartJobAsync(
        string id,
        HttpContext ctx,
        IAdminRepository repo,
        AdminEngineService engine,
        CancellationToken ct)
    {
        if (!TryParseIdAndProfessional(id, "Job", ctx, out Guid jobId, out Guid proId, out IResult? idErr))
        {
            return idErr!;
        }

        var job = await repo.GetAssignedProfessionalJobAsync(jobId, proId, ct);
        if (job is null)
        {
            return NotFoundJob();
        }

        if (job.Status != JobStateMachine.Assigned ||
            !engine.StateMachine.CanTransition(job.Status, JobStateMachine.InProgress))
        {
            return ConflictTransition($"Cannot start work on a job in status '{job.Status}'.");
        }

        var updated = await repo.StartProfessionalJobAsync(
            jobId,
            proId,
            job.CustomerId,
            job.Title,
            ct);

        engine.InvalidateAfterJobMutation(jobId);
        return Results.Ok(new
        {
            id = updated.Id,
            previousStatus = job.Status,
            status = updated.Status,
            workStartedAt = updated.WorkStartedAt,
            updatedAt = updated.UpdatedAt,
        });
    }

    private static async Task<IResult> MarkJobDoneAsync(
        string id,
        MarkDoneRequest? request,
        HttpContext ctx,
        IAdminRepository repo,
        AdminEngineService engine,
        CancellationToken ct)
    {
        if (!TryParseIdAndProfessional(id, "Job", ctx, out Guid jobId, out Guid proId, out IResult? idErr))
        {
            return idErr!;
        }

        string? cleanNote = string.IsNullOrWhiteSpace(request?.Note) ? null : request!.Note!.Trim();
        if (cleanNote is not null && cleanNote.Length > 500)
        {
            return ValidationError("Completion note cannot exceed 500 characters.");
        }

        var job = await repo.GetAssignedProfessionalJobAsync(jobId, proId, ct);
        if (job is null)
        {
            return NotFoundJob();
        }

        if (job.Status != JobStateMachine.InProgress)
        {
            return ConflictTransition($"Cannot mark work as done when the job status is '{job.Status}'.");
        }

        if (job.ProfessionalMarkedDoneAt.HasValue)
        {
            return Results.Conflict(new ApiErrorResponse(
                "already_marked_done",
                "Work on this job has already been marked as done."));
        }

        var updated = await repo.MarkProfessionalJobDoneAsync(
            jobId,
            proId,
            job.CustomerId,
            job.Title,
            cleanNote,
            ct);

        engine.InvalidateAfterJobMutation(jobId);
        return Results.Ok(new
        {
            id = updated.Id,
            status = updated.Status,
            professionalMarkedDoneAt = updated.ProfessionalMarkedDoneAt,
            updatedAt = updated.UpdatedAt,
        });
    }

    private static async Task<IResult> DisputeJobAsync(
        string id,
        DisputeJobRequest? request,
        HttpContext ctx,
        IAdminRepository repo,
        AdminEngineService engine,
        CancellationToken ct)
    {
        if (!TryParseIdAndProfessional(id, "Job", ctx, out Guid jobId, out Guid proId, out IResult? idErr))
        {
            return idErr!;
        }

        string reason = (request?.Reason ?? string.Empty).Trim();
        if (reason.Length < 10 || reason.Length > 1000)
        {
            return ValidationError("Dispute reason must be between 10 and 1000 characters.");
        }

        var job = await repo.GetAssignedProfessionalJobAsync(jobId, proId, ct);
        if (job is null)
        {
            return NotFoundJob();
        }

        bool canDispute =
            (job.Status == JobStateMachine.Assigned || job.Status == JobStateMachine.InProgress)
            && engine.StateMachine.CanTransition(job.Status, JobStateMachine.Disputed);

        if (!canDispute)
        {
            return ConflictTransition($"Cannot open a dispute when the job status is '{job.Status}'.");
        }

        var updated = await repo.DisputeProfessionalJobAsync(
            jobId,
            proId,
            job.CustomerId,
            job.Status,
            job.Title,
            reason,
            ct);

        engine.InvalidateAfterJobMutation(jobId);
        return Results.Ok(new
        {
            id = updated.Id,
            previousStatus = job.Status,
            status = updated.Status,
            updatedAt = updated.UpdatedAt,
        });
    }

    private static IResult? ValidateOfferFields(
        decimal price,
        decimal? inspectionFee,
        int etaMinutes,
        string? message)
    {
        if (price <= 0m || price > MaxOfferPrice)
        {
            return ValidationError("Offer price must be greater than 0 and at most 10,000,000 PKR.");
        }

        decimal fee = inspectionFee ?? 0m;
        if (fee < 0m || fee > MaxInspectionFee)
        {
            return ValidationError("Inspection fee must be between 0 and 100,000 PKR.");
        }

        if (etaMinutes < MinEtaMinutes || etaMinutes > MaxEtaMinutes)
        {
            return ValidationError("Estimated arrival time must be between 10 and 10,080 minutes.");
        }

        if (!string.IsNullOrWhiteSpace(message) && message.Trim().Length > MaxMessageLength)
        {
            return ValidationError("Offer message cannot exceed 500 characters.");
        }

        return null;
    }

    private static async Task<string> ResolveProfessionalNameAsync(
        Guid proId,
        IAdminRepository repo,
        AdminRoleCache roleCache,
        CancellationToken ct)
    {
        if (roleCache.TryGet(proId, out var cached) && !string.IsNullOrWhiteSpace(cached.FullName))
        {
            return cached.FullName!;
        }

        var record = await repo.GetUserAuthRecordAsync(proId, ct);
        if (record is not null)
        {
            roleCache.Put(proId, record);
            if (!string.IsNullOrWhiteSpace(record.FullName))
            {
                return record.FullName!;
            }
        }

        return "Professional";
    }

    private static bool TryParseIdAndProfessional(
        string id,
        string entityName,
        HttpContext ctx,
        out Guid parsedId,
        out Guid proId,
        out IResult? error)
    {
        proId = Guid.Empty;
        if (!Guid.TryParse(id, out parsedId))
        {
            error = Results.BadRequest(new ApiErrorResponse("invalid_id", $"{entityName} ID must be a valid UUID."));
            return false;
        }

        string? sub = ctx.User.FindFirst("sub")?.Value
                      ?? ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(sub, out proId))
        {
            error = Results.Unauthorized();
            return false;
        }

        error = null;
        return true;
    }

    private static IResult ValidationError(string message) =>
        Results.BadRequest(new ApiErrorResponse("validation_error", message));

    private static IResult NotFoundJob() =>
        Results.NotFound(new ApiErrorResponse("job_not_found", "Job not found."));

    private static IResult NotFoundOffer() =>
        Results.NotFound(new ApiErrorResponse("offer_not_found", "Offer not found."));

    private static IResult ConflictTransition(string message) =>
        Results.Conflict(new ApiErrorResponse("invalid_transition", message));

    private static object FormatOfferResponse(ProfessionalOfferRecord offer) =>
        new
        {
            id = offer.Id,
            jobId = offer.JobId,
            professionalId = offer.ProfessionalId,
            price = offer.Price,
            inspectionFee = offer.InspectionFee,
            etaMinutes = offer.EtaMinutes,
            message = offer.Message,
            status = offer.Status,
            jobStatus = offer.JobStatus,
            createdAt = offer.CreatedAt,
            updatedAt = offer.UpdatedAt,
        };
}
