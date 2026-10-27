using System.Security.Claims;
using System.Text.Json;
using ProLink.Api.Data;
using ProLink.Api.Models;
using ProLink.Api.Services;
using ProLink.Engine.Rules;

namespace ProLink.Api.Endpoints;

public static class AdminJobsAndDisputesEndpoints
{
    public static void MapAdminJobsAndDisputesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/admin").RequireAuthorization("Admin");

        group.MapGet("/jobs/{id}/allowed-actions", async (
            string id,
            IAdminRepository repo,
            AdminEngineService engine,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(id, out Guid jobId))
            {
                return Results.BadRequest(new ApiErrorResponse("invalid_id", "Job ID must be a valid UUID."));
            }

            var job = await repo.GetJobStatusAsync(jobId, ct);
            if (job is null)
            {
                return Results.NotFound(new ApiErrorResponse("job_not_found", $"No job found with ID {jobId}."));
            }

            var actions = engine.StateMachine.GetAllowedActions(job.Status);
            return Results.Ok(new
            {
                jobId = job.JobId,
                currentStatus = actions.CurrentStatus,
                nextStates = actions.NextStates,
                canForceCancel = actions.CanForceCancel,
                canResolveDispute = actions.CanResolveDispute,
                disputeOutcomes = actions.DisputeOutcomes,
            });
        });

        group.MapPost("/jobs/{id}/force-cancel", async (
            string id,
            ForceCancelRequest? request,
            HttpContext ctx,
            IAdminRepository repo,
            AdminEngineService engine,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(id, out Guid jobId))
            {
                return Results.BadRequest(new ApiErrorResponse("invalid_id", "Job ID must be a valid UUID."));
            }

            string reason = (request?.Reason ?? string.Empty).Trim();
            if (reason.Length < 10 || reason.Length > 500)
            {
                return Results.BadRequest(new ApiErrorResponse(
                    "validation_error",
                    "Force cancellation reason must be between 10 and 500 characters."));
            }

            if (!TryGetAdminId(ctx, out Guid adminId))
            {
                return Results.Unauthorized();
            }

            var job = await repo.GetJobStatusAsync(jobId, ct);
            if (job is null)
            {
                return Results.NotFound(new ApiErrorResponse("job_not_found", $"No job found with ID {jobId}."));
            }

            if (!engine.StateMachine.CanForceCancel(job.Status))
            {
                return Results.Conflict(new ApiErrorResponse(
                    "invalid_transition",
                    $"Cannot force-cancel a job in status '{job.Status}'."));
            }

            string detailsJson = JsonSerializer.Serialize(new
            {
                fromStatus = job.Status,
                toStatus = JobStateMachine.Cancelled,
                reason,
            });

            await repo.TransitionJobWithAuditAsync(
                jobId,
                job.Status,
                JobStateMachine.Cancelled,
                adminId,
                reason,
                "job_force_cancelled",
                detailsJson,
                ct);

            engine.InvalidateAfterJobMutation(jobId);

            return Results.Ok(new
            {
                jobId,
                previousStatus = job.Status,
                newStatus = JobStateMachine.Cancelled,
            });
        });

        group.MapPost("/disputes/{id}/resolve", async (
            string id,
            ResolveDisputeRequest? request,
            HttpContext ctx,
            IAdminRepository repo,
            AdminEngineService engine,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(id, out Guid jobId))
            {
                return Results.BadRequest(new ApiErrorResponse("invalid_id", "Job ID must be a valid UUID."));
            }

            string outcomeRaw = (request?.Outcome ?? string.Empty).Trim().ToLowerInvariant();
            string? targetStatus = outcomeRaw switch
            {
                "completed" => JobStateMachine.Completed,
                "cancelled" => JobStateMachine.Cancelled,
                _ => null,
            };

            if (targetStatus is null)
            {
                return Results.BadRequest(new ApiErrorResponse(
                    "validation_error",
                    "Dispute outcome must be 'completed' or 'cancelled'."));
            }

            string note = (request?.Note ?? string.Empty).Trim();
            if (note.Length < 10 || note.Length > 500)
            {
                return Results.BadRequest(new ApiErrorResponse(
                    "validation_error",
                    "Dispute resolution note must be between 10 and 500 characters."));
            }

            if (!TryGetAdminId(ctx, out Guid adminId))
            {
                return Results.Unauthorized();
            }

            var job = await repo.GetJobStatusAsync(jobId, ct);
            if (job is null)
            {
                return Results.NotFound(new ApiErrorResponse("job_not_found", $"No job found with ID {jobId}."));
            }

            if (!engine.StateMachine.CanResolveDispute(job.Status, targetStatus))
            {
                return Results.Conflict(new ApiErrorResponse(
                    "invalid_transition",
                    $"Cannot resolve dispute for job in status '{job.Status}'. Job must be in 'Disputed' status."));
            }

            string detailsJson = JsonSerializer.Serialize(new
            {
                fromStatus = job.Status,
                toStatus = targetStatus,
                outcome = outcomeRaw,
                note,
            });

            await repo.TransitionJobWithAuditAsync(
                jobId,
                job.Status,
                targetStatus,
                adminId,
                note,
                "dispute_resolved_" + outcomeRaw,
                detailsJson,
                ct);

            engine.InvalidateAfterJobMutation(jobId);

            return Results.Ok(new
            {
                jobId,
                previousStatus = job.Status,
                newStatus = targetStatus,
                outcome = outcomeRaw,
            });
        });
    }

    private static bool TryGetAdminId(HttpContext ctx, out Guid adminId)
    {
        string? sub = ctx.User.FindFirst("sub")?.Value
                      ?? ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out adminId);
    }
}
