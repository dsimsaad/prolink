using ProLink.Api.Models;
using ProLink.Api.Services;

namespace ProLink.Api.Endpoints;

public static class AdminSearchEndpoints
{
    public static void MapAdminSearchEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/admin").RequireAuthorization("Admin");

        group.MapGet("/users/suggest", async (string? q, int? limit, AdminEngineService engine, CancellationToken ct) =>
        {
            string query = (q ?? string.Empty).Trim();
            if (query.Length > 80)
            {
                return Results.BadRequest(new ApiErrorResponse("invalid_query", "Query parameter 'q' cannot exceed 80 characters."));
            }

            int safeLimit = limit ?? 8;
            if (safeLimit < 1 || safeLimit > 25)
            {
                return Results.BadRequest(new ApiErrorResponse("invalid_query", "limit must be between 1 and 25."));
            }

            if (query.Length == 0)
            {
                return Results.Ok(new { items = Array.Empty<object>() });
            }

            var suggestions = await engine.SuggestUsersAsync(query, safeLimit, ct);
            var items = new object[suggestions.Length];

            for (int i = 0; i < suggestions.Length; i++)
            {
                items[i] = new
                {
                    id = suggestions[i].Id,
                    displayName = suggestions[i].DisplayName,
                };
            }

            return Results.Ok(new { items });
        });

        group.MapGet("/users/search", async (string? q, AdminEngineService engine, CancellationToken ct) =>
        {
            string query = (q ?? string.Empty).Trim();
            if (query.Length > 120)
            {
                return Results.BadRequest(new ApiErrorResponse("invalid_query", "Query parameter 'q' cannot exceed 120 characters."));
            }

            if (query.Length == 0)
            {
                return Results.Ok(new { items = Array.Empty<object>() });
            }

            var hits = await engine.SearchUsersAsync(query, ct);
            var items = new object[hits.Length];

            for (int i = 0; i < hits.Length; i++)
            {
                items[i] = new
                {
                    id = hits[i].Id,
                    displayName = hits[i].DisplayName,
                    matchedTokens = hits[i].MatchedTokens,
                };
            }

            return Results.Ok(new { items });
        });

        group.MapGet("/jobs/search", async (string? q, AdminEngineService engine, CancellationToken ct) =>
        {
            string query = (q ?? string.Empty).Trim();
            if (query.Length > 120)
            {
                return Results.BadRequest(new ApiErrorResponse("invalid_query", "Query parameter 'q' cannot exceed 120 characters."));
            }

            if (query.Length == 0)
            {
                return Results.Ok(new { jobIds = Array.Empty<string>() });
            }

            string[] jobIds = await engine.SearchJobsAsync(query, ct);
            return Results.Ok(new { jobIds });
        });
    }
}
