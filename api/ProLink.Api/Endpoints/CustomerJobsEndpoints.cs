using System.Net.Http.Json;
using System.Security.Claims;
using Npgsql;
using ProLink.Api.Data;
using ProLink.Api.Models;
using ProLink.Api.Services;
using ProLink.Engine.Abstractions;
using ProLink.Engine.Rules;

namespace ProLink.Api.Endpoints;

public static class CustomerJobsEndpoints
{
    public static void MapCustomerJobsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/jobs").RequireAuthorization("Customer");

        group.MapPost("", CreateJobAsync);
        group.MapPatch("/{id}", UpdateDraftJobAsync);
        group.MapPost("/{id}/publish", PublishJobAsync);
        group.MapPost("/{id}/cancel", CancelJobAsync);
        group.MapPost("/{id}/offers/{offerId}/accept", AcceptOfferAsync);
        group.MapPost("/{id}/complete", CompleteJobAsync);
        group.MapPost("/{id}/dispute", DisputeJobAsync);
        group.MapPost("/{id}/review", CreateReviewAsync);
        group.MapGet("/suggest-category", SuggestCategoryAsync);
    }

    private static async Task<IResult> CreateJobAsync(
        CreateJobRequest? request,
        HttpContext ctx,
        IAdminRepository repo,
        IJobMatcher matcher,
        AdminEngineService engine,
        IClock clock,
        CancellationToken ct)
    {
        if (!TryGetCustomerId(ctx, out Guid customerId))
        {
            return Results.Unauthorized();
        }

        var validationError = await ValidateJobFieldsAsync(
            request?.Title,
            request?.Description,
            request?.CategoryId ?? 0,
            request?.AreaId ?? 0,
            request?.BudgetMin,
            request?.BudgetMax,
            request?.Urgency,
            repo,
            ct);

        if (validationError is not null)
        {
            return validationError;
        }

        string cleanTitle = request!.Title!.Trim();
        string cleanDescription = request.Description!.Trim();
        string cleanUrgency = request.Urgency!.Trim().ToLowerInvariant();
        DateTimeOffset? expiresAt = request.Publish ? clock.UtcNow.AddDays(7) : null;

        var created = await repo.CreateCustomerJobAsync(
            customerId,
            cleanTitle,
            cleanDescription,
            request.CategoryId,
            request.AreaId,
            request.BudgetMin,
            request.BudgetMax,
            cleanUrgency,
            request.Publish,
            expiresAt,
            ct);

        int matchedProfessionals = 0;
        if (request.Publish)
        {
            matchedProfessionals = await matcher.NotifyMatchingProfessionalsAsync(created, ct);
        }

        engine.InvalidateAfterJobMutation(created.Id);
        return Results.Created($"/jobs/{created.Id}", FormatJobResponse(created, matchedProfessionals));
    }

    private static async Task<IResult> UpdateDraftJobAsync(
        string id,
        UpdateDraftJobRequest? request,
        HttpContext ctx,
        IAdminRepository repo,
        AdminEngineService engine,
        CancellationToken ct)
    {
        if (!TryParseJobAndCustomer(id, ctx, out Guid jobId, out Guid customerId, out IResult? idError))
        {
            return idError!;
        }

        var job = await repo.GetCustomerJobAsync(jobId, customerId, ct);
        if (job is null)
        {
            return NotFoundJob();
        }

        if (job.Status != JobStateMachine.Draft)
        {
            return ConflictTransition($"Only jobs in '{JobStateMachine.Draft}' status can be edited.");
        }

        var validationError = await ValidateJobFieldsAsync(
            request?.Title,
            request?.Description,
            request?.CategoryId ?? 0,
            request?.AreaId ?? 0,
            request?.BudgetMin,
            request?.BudgetMax,
            request?.Urgency,
            repo,
            ct);

        if (validationError is not null)
        {
            return validationError;
        }

        var updated = await repo.UpdateDraftJobAsync(
            jobId,
            customerId,
            request!.Title!.Trim(),
            request.Description!.Trim(),
            request.CategoryId,
            request.AreaId,
            request.BudgetMin,
            request.BudgetMax,
            request.Urgency!.Trim().ToLowerInvariant(),
            ct);

        engine.InvalidateAfterJobMutation(jobId);
        return Results.Ok(FormatJobResponse(updated));
    }

    private static async Task<IResult> PublishJobAsync(
        string id,
        HttpContext ctx,
        IAdminRepository repo,
        IJobMatcher matcher,
        AdminEngineService engine,
        IClock clock,
        CancellationToken ct)
    {
        if (!TryParseJobAndCustomer(id, ctx, out Guid jobId, out Guid customerId, out IResult? idError))
        {
            return idError!;
        }

        var job = await repo.GetCustomerJobAsync(jobId, customerId, ct);
        if (job is null)
        {
            return NotFoundJob();
        }

        if (job.Status != JobStateMachine.Draft || !engine.StateMachine.CanTransition(job.Status, JobStateMachine.Open))
        {
            return ConflictTransition($"Cannot publish a job from status '{job.Status}'.");
        }

        DateTimeOffset expiresAt = clock.UtcNow.AddDays(7);
        var updated = await repo.PublishCustomerJobAsync(jobId, customerId, expiresAt, ct);
        int matchedProfessionals = await matcher.NotifyMatchingProfessionalsAsync(updated, ct);

        engine.InvalidateAfterJobMutation(jobId);
        return Results.Ok(new
        {
            id = updated.Id,
            previousStatus = job.Status,
            status = updated.Status,
            expiresAt = updated.ExpiresAt,
            matchedProfessionals,
            updatedAt = updated.UpdatedAt,
        });
    }

    private static async Task<IResult> CancelJobAsync(
        string id,
        CancelJobRequest? request,
        HttpContext ctx,
        IAdminRepository repo,
        AdminEngineService engine,
        CancellationToken ct)
    {
        if (!TryParseJobAndCustomer(id, ctx, out Guid jobId, out Guid customerId, out IResult? idError))
        {
            return idError!;
        }

        string? reason = string.IsNullOrWhiteSpace(request?.Reason) ? null : request!.Reason!.Trim();
        if (reason is not null && reason.Length > 500)
        {
            return ValidationError("Cancellation reason cannot exceed 500 characters.");
        }

        var job = await repo.GetCustomerJobAsync(jobId, customerId, ct);
        if (job is null)
        {
            return NotFoundJob();
        }

        if (!engine.StateMachine.CanCustomerCancel(job.Status))
        {
            return ConflictTransition($"Cannot cancel a job in status '{job.Status}'.");
        }

        var updated = await repo.CancelCustomerJobAsync(
            jobId,
            customerId,
            job.Status,
            job.AssignedProfessionalId,
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

    private static async Task<IResult> AcceptOfferAsync(
        string id,
        string offerId,
        HttpContext ctx,
        IAdminRepository repo,
        AdminEngineService engine,
        CancellationToken ct)
    {
        if (!TryParseJobAndCustomer(id, ctx, out Guid jobId, out Guid customerId, out IResult? idError))
        {
            return idError!;
        }

        if (!Guid.TryParse(offerId, out Guid parsedOfferId))
        {
            return Results.BadRequest(new ApiErrorResponse("invalid_id", "Offer ID must be a valid UUID."));
        }

        var job = await repo.GetCustomerJobAsync(jobId, customerId, ct);
        if (job is null)
        {
            return NotFoundJob();
        }

        bool canAcceptOnStatus =
            (job.Status == JobStateMachine.Open || job.Status == JobStateMachine.OffersReceived)
            && engine.StateMachine.CanTransition(job.Status, JobStateMachine.Assigned);

        if (!canAcceptOnStatus)
        {
            return ConflictTransition($"Cannot accept an offer when job is in status '{job.Status}'.");
        }

        var offer = await repo.GetJobOfferAsync(jobId, parsedOfferId, ct);
        if (offer is null)
        {
            return Results.NotFound(new ApiErrorResponse("offer_not_found", "Offer not found for this job."));
        }

        if (!string.Equals(offer.Status, "pending", StringComparison.OrdinalIgnoreCase))
        {
            return Results.Conflict(new ApiErrorResponse("offer_not_pending", "Only a pending offer can be accepted."));
        }

        if (offer.ProfessionalId == customerId)
        {
            return Results.Conflict(new ApiErrorResponse("self_dealing_not_allowed", "You cannot accept an offer from your own account."));
        }

        var result = await repo.AcceptOfferAsync(
            jobId,
            customerId,
            job.Status,
            job.Title,
            offer.Id,
            offer.ProfessionalId,
            ct);

        engine.InvalidateAfterJobMutation(jobId);
        return Results.Ok(new
        {
            jobId = result.JobId,
            previousStatus = result.PreviousStatus,
            status = result.Status,
            acceptedOfferId = result.AcceptedOfferId,
            assignedProfessionalId = result.AssignedProfessionalId,
            conversationId = result.ConversationId,
            updatedAt = result.UpdatedAt,
        });
    }

    private static async Task<IResult> CompleteJobAsync(
        string id,
        HttpContext ctx,
        IAdminRepository repo,
        AdminEngineService engine,
        CancellationToken ct)
    {
        if (!TryParseJobAndCustomer(id, ctx, out Guid jobId, out Guid customerId, out IResult? idError))
        {
            return idError!;
        }

        var job = await repo.GetCustomerJobAsync(jobId, customerId, ct);
        if (job is null)
        {
            return NotFoundJob();
        }

        if (job.Status != JobStateMachine.InProgress || !engine.StateMachine.CanTransition(job.Status, JobStateMachine.Completed))
        {
            return ConflictTransition($"Cannot mark a job as completed when its status is '{job.Status}'.");
        }

        var updated = await repo.CompleteCustomerJobAsync(
            jobId,
            customerId,
            job.AssignedProfessionalId,
            job.Title,
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

    private static async Task<IResult> DisputeJobAsync(
        string id,
        DisputeJobRequest? request,
        HttpContext ctx,
        IAdminRepository repo,
        AdminEngineService engine,
        CancellationToken ct)
    {
        if (!TryParseJobAndCustomer(id, ctx, out Guid jobId, out Guid customerId, out IResult? idError))
        {
            return idError!;
        }

        string reason = (request?.Reason ?? string.Empty).Trim();
        if (reason.Length < 10 || reason.Length > 1000)
        {
            return ValidationError("Dispute reason must be between 10 and 1000 characters.");
        }

        var job = await repo.GetCustomerJobAsync(jobId, customerId, ct);
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

        var updated = await repo.DisputeCustomerJobAsync(
            jobId,
            customerId,
            job.Status,
            job.AssignedProfessionalId,
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

    private static async Task<IResult> CreateReviewAsync(
        string id,
        CreateReviewRequest? request,
        HttpContext ctx,
        IAdminRepository repo,
        CancellationToken ct)
    {
        if (!TryParseJobAndCustomer(id, ctx, out Guid jobId, out Guid customerId, out IResult? idError))
        {
            return idError!;
        }

        if (request is null || request.Rating < 1 || request.Rating > 5)
        {
            return ValidationError("Rating must be an integer between 1 and 5.");
        }

        string? comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim();
        if (comment is not null && comment.Length > 1000)
        {
            return ValidationError("Review comment cannot exceed 1000 characters.");
        }

        var job = await repo.GetCustomerJobAsync(jobId, customerId, ct);
        if (job is null)
        {
            return NotFoundJob();
        }

        if (job.Status != JobStateMachine.Completed || !job.AssignedProfessionalId.HasValue)
        {
            return ConflictTransition("Reviews can only be submitted for completed jobs.");
        }

        if (await repo.HasReviewForJobAsync(jobId, ct))
        {
            return Results.Conflict(new ApiErrorResponse("duplicate_review", "A review has already been submitted for this job."));
        }

        try
        {
            var review = await repo.CreateReviewAsync(
                jobId,
                customerId,
                job.AssignedProfessionalId.Value,
                request.Rating,
                comment,
                ct);

            return Results.Created($"/jobs/{jobId}/review", new
            {
                id = review.Id,
                jobId = review.JobId,
                reviewerId = review.ReviewerId,
                professionalId = review.ProfessionalId,
                rating = review.Rating,
                comment = review.Comment,
                createdAt = review.CreatedAt,
            });
        }
        catch (PostgresException ex) when (ex.SqlState is "23505" or "22023" or "42501")
        {
            return Results.Conflict(new ApiErrorResponse("duplicate_review", "A review has already been submitted for this job."));
        }
    }

    private static async Task<IResult> SuggestCategoryAsync(
        string? text,
        IConfiguration config,
        IHttpClientFactory httpClientFactory,
        IAdminRepository repo,
        CancellationToken ct)
    {
        string cleanText = (text ?? string.Empty).Trim();
        string? insightUrl = (Environment.GetEnvironmentVariable("INSIGHT_URL") ?? config["INSIGHT_URL"])?.TrimEnd('/');

        if (cleanText.Length < 10 || string.IsNullOrWhiteSpace(insightUrl))
        {
            return EmptyCategorySuggestion();
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(3));

            var client = httpClientFactory.CreateClient("Insight");
            string titleSnippet = cleanText.Length > 120 ? cleanText[..120] : cleanText;
            var response = await client.PostAsJsonAsync(
                $"{insightUrl}/classify",
                new { title = titleSnippet, description = cleanText },
                timeoutCts.Token);

            if (!response.IsSuccessStatusCode)
            {
                return EmptyCategorySuggestion();
            }

            var payload = await response.Content.ReadFromJsonAsync<InsightClassifyResponse>(cancellationToken: timeoutCts.Token);
            if (payload is null || string.IsNullOrWhiteSpace(payload.SuggestedCategory) || payload.Confidence <= 0)
            {
                return EmptyCategorySuggestion();
            }

            var categories = await repo.GetActiveCategoriesAsync(timeoutCts.Token);
            var matched = categories.FirstOrDefault(c =>
                string.Equals(c.Name, payload.SuggestedCategory.Trim(), StringComparison.OrdinalIgnoreCase));

            if (matched is null)
            {
                return EmptyCategorySuggestion();
            }

            return Results.Ok(new
            {
                suggestedCategoryId = (long?)matched.Id,
                suggestedCategoryName = matched.Name,
                confidence = payload.Confidence,
            });
        }
        catch
        {
            return EmptyCategorySuggestion();
        }
    }

    private static async Task<IResult?> ValidateJobFieldsAsync(
        string? title,
        string? description,
        long categoryId,
        long areaId,
        decimal? budgetMin,
        decimal? budgetMax,
        string? urgency,
        IAdminRepository repo,
        CancellationToken ct)
    {
        string cleanTitle = (title ?? string.Empty).Trim();
        if (cleanTitle.Length < 5 || cleanTitle.Length > 120)
        {
            return ValidationError("Title must be between 5 and 120 characters.");
        }

        string cleanDescription = (description ?? string.Empty).Trim();
        if (cleanDescription.Length < 20 || cleanDescription.Length > 2000)
        {
            return ValidationError("Description must be between 20 and 2000 characters.");
        }

        if (budgetMin.HasValue && budgetMin.Value < 0)
        {
            return ValidationError("Minimum budget cannot be negative.");
        }

        if (budgetMax.HasValue && budgetMax.Value < 0)
        {
            return ValidationError("Maximum budget cannot be negative.");
        }

        if (budgetMin.HasValue && budgetMax.HasValue && budgetMin.Value > budgetMax.Value)
        {
            return ValidationError("Minimum budget cannot exceed maximum budget.");
        }

        string cleanUrgency = (urgency ?? string.Empty).Trim().ToLowerInvariant();
        if (cleanUrgency != "normal" && cleanUrgency != "urgent")
        {
            return ValidationError("Urgency must be 'normal' or 'urgent'.");
        }

        if (categoryId <= 0 || !await repo.IsActiveCategoryAsync(categoryId, ct))
        {
            return ValidationError("Selected category does not exist or is inactive.");
        }

        if (areaId <= 0 || !await repo.AreaExistsAsync(areaId, ct))
        {
            return ValidationError("Selected service area does not exist.");
        }

        return null;
    }

    private static bool TryParseJobAndCustomer(
        string id,
        HttpContext ctx,
        out Guid jobId,
        out Guid customerId,
        out IResult? error)
    {
        customerId = Guid.Empty;
        if (!Guid.TryParse(id, out jobId))
        {
            error = Results.BadRequest(new ApiErrorResponse("invalid_id", "Job ID must be a valid UUID."));
            return false;
        }

        if (!TryGetCustomerId(ctx, out customerId))
        {
            error = Results.Unauthorized();
            return false;
        }

        error = null;
        return true;
    }

    private static bool TryGetCustomerId(HttpContext ctx, out Guid customerId)
    {
        string? sub = ctx.User.FindFirst("sub")?.Value
                      ?? ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out customerId);
    }

    private static IResult ValidationError(string message) =>
        Results.BadRequest(new ApiErrorResponse("validation_error", message));

    private static IResult NotFoundJob() =>
        Results.NotFound(new ApiErrorResponse("job_not_found", "Job not found."));

    private static IResult ConflictTransition(string message) =>
        Results.Conflict(new ApiErrorResponse("invalid_transition", message));

    private static IResult EmptyCategorySuggestion() =>
        Results.Ok(new
        {
            suggestedCategoryId = (long?)null,
            suggestedCategoryName = (string?)null,
            confidence = 0d,
        });

    private static object FormatJobResponse(CustomerJobRecord job, int? matchedProfessionals = null) =>
        new
        {
            id = job.Id,
            customerId = job.CustomerId,
            title = job.Title,
            description = job.Description,
            categoryId = job.CategoryId,
            areaId = job.AreaId,
            budgetMin = job.BudgetMin,
            budgetMax = job.BudgetMax,
            urgency = job.Urgency,
            status = job.Status,
            assignedProfessionalId = job.AssignedProfessionalId,
            expiresAt = job.ExpiresAt,
            createdAt = job.CreatedAt,
            updatedAt = job.UpdatedAt,
            matchedProfessionals,
        };

    private sealed record InsightClassifyResponse(
        [property: System.Text.Json.Serialization.JsonPropertyName("suggested_category")] string? SuggestedCategory,
        [property: System.Text.Json.Serialization.JsonPropertyName("confidence")] double Confidence,
        [property: System.Text.Json.Serialization.JsonPropertyName("is_fallback")] bool IsFallback);
}
