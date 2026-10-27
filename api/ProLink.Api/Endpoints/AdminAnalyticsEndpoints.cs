using ProLink.Api.Models;
using ProLink.Api.Services;

namespace ProLink.Api.Endpoints;

public static class AdminAnalyticsEndpoints
{
    public static void MapAdminAnalyticsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/admin/analytics").RequireAuthorization("Admin");

        group.MapGet("/funnel", async (AdminEngineService engine, CancellationToken ct) =>
        {
            var funnel = await engine.GetFunnelAsync(ct);
            return Results.Ok(new
            {
                posted = funnel.Posted,
                receivedOffers = funnel.ReceivedOffers,
                assigned = funnel.Assigned,
                completed = funnel.Completed,
            });
        });

        group.MapGet("/top-categories", async (int? n, AdminEngineService engine, CancellationToken ct) =>
        {
            int count = n ?? 5;
            if (count < 1 || count > 50)
            {
                return Results.BadRequest(new ApiErrorResponse("invalid_query", "Parameter 'n' must be between 1 and 50."));
            }

            var top = await engine.GetTopCategoriesAsync(count, ct);
            var items = new object[top.Length];

            for (int i = 0; i < top.Length; i++)
            {
                items[i] = new
                {
                    id = top[i].Id,
                    name = top[i].Name,
                    jobCount = top[i].JobCount,
                };
            }

            return Results.Ok(new { items });
        });

        group.MapGet("/top-areas", async (int? n, AdminEngineService engine, CancellationToken ct) =>
        {
            int count = n ?? 5;
            if (count < 1 || count > 50)
            {
                return Results.BadRequest(new ApiErrorResponse("invalid_query", "Parameter 'n' must be between 1 and 50."));
            }

            var top = await engine.GetTopAreasAsync(count, ct);
            var items = new object[top.Length];

            for (int i = 0; i < top.Length; i++)
            {
                items[i] = new
                {
                    id = top[i].Id,
                    name = top[i].Name,
                    jobCount = top[i].JobCount,
                };
            }

            return Results.Ok(new { items });
        });
    }
}
