using ProLink.Api.Models;
using ProLink.Api.Services;

namespace ProLink.Api.Endpoints;

public static class AdminQueueAndAuditEndpoints
{
    public static void MapAdminQueueAndAuditEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/admin").RequireAuthorization("Admin");

        group.MapGet("/review-queue", async (int? limit, AdminEngineService engine, CancellationToken ct) =>
        {
            int requestedLimit = limit ?? 20;
            if (requestedLimit < 1 || requestedLimit > 100)
            {
                return Results.BadRequest(new ApiErrorResponse("invalid_query", "limit must be between 1 and 100."));
            }

            var (items, totalCount, refreshedAt) = await engine.GetReviewQueueAsync(requestedLimit, ct);
            var dtoItems = new object[items.Length];

            for (int i = 0; i < items.Length; i++)
            {
                var item = items[i];
                dtoItems[i] = new
                {
                    key = item.Key,
                    kind = item.Kind.ToString().ToLowerInvariant(),
                    entityId = item.EntityId,
                    title = item.Title,
                    subtitle = item.Subtitle,
                    createdAt = item.CreatedAt,
                    priorityScore = item.PriorityScore,
                    link = item.Link,
                };
            }

            return Results.Ok(new
            {
                items = dtoItems,
                totalCount,
                refreshedAt,
            });
        });

        group.MapPost("/review-queue/refresh", async (AdminEngineService engine, CancellationToken ct) =>
        {
            var (totalCount, refreshedAt) = await engine.RefreshReviewQueueAsync(ct);
            return Results.Ok(new
            {
                totalCount,
                refreshedAt,
            });
        });

        group.MapGet("/audit", async (
            string? from,
            string? to,
            int? page,
            int? pageSize,
            AdminEngineService engine,
            CancellationToken ct) =>
        {
            DateTimeOffset? fromDate = null;
            DateTimeOffset? toDate = null;

            if (!string.IsNullOrWhiteSpace(from))
            {
                if (!DateTimeOffset.TryParse(from, out var parsedFrom))
                {
                    return Results.BadRequest(new ApiErrorResponse("invalid_query", "Invalid 'from' timestamp."));
                }
                fromDate = parsedFrom;
            }

            if (!string.IsNullOrWhiteSpace(to))
            {
                if (!DateTimeOffset.TryParse(to, out var parsedTo))
                {
                    return Results.BadRequest(new ApiErrorResponse("invalid_query", "Invalid 'to' timestamp."));
                }
                toDate = parsedTo;
            }

            int safePage = page ?? 1;
            int safePageSize = pageSize ?? 20;
            if (safePage < 1)
            {
                return Results.BadRequest(new ApiErrorResponse("invalid_query", "page must be at least 1."));
            }
            if (safePageSize < 1)
            {
                return Results.BadRequest(new ApiErrorResponse("invalid_query", "pageSize must be at least 1."));
            }
            if (safePageSize > 100)
            {
                safePageSize = 100;
            }

            var (entries, totalCount) = await engine.GetAuditPageAsync(safePage, safePageSize, fromDate, toDate, ct);
            var items = new object[entries.Length];

            for (int i = 0; i < entries.Length; i++)
            {
                var e = entries[i];
                items[i] = new
                {
                    id = e.Id,
                    adminId = e.AdminId,
                    adminName = e.AdminName,
                    action = e.Action,
                    targetType = e.TargetType,
                    targetId = e.TargetId,
                    details = e.DetailsJson,
                    createdAt = e.CreatedAt,
                };
            }

            return Results.Ok(new
            {
                items,
                page = safePage,
                pageSize = safePageSize,
                totalCount,
            });
        });

        group.MapGet("/audit/summary", async (int? days, AdminEngineService engine, CancellationToken ct) =>
        {
            int requestedDays = days ?? 14;
            if (requestedDays < 1 || requestedDays > 60)
            {
                return Results.BadRequest(new ApiErrorResponse("invalid_query", "days must be between 1 and 60."));
            }

            var (totalInPeriod, dailyCounts) = await engine.GetAuditSummaryAsync(requestedDays, ct);
            return Results.Ok(new
            {
                days = requestedDays,
                totalInPeriod,
                dailyCounts,
            });
        });
    }
}
