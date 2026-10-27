using System.Security.Claims;
using ProLink.Api.Services;

namespace ProLink.Api.Endpoints;

public static class AdminSystemEndpoints
{
    public static void MapAdminSystemEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/admin").RequireAuthorization("Admin");

        group.MapGet("/ping", (HttpContext ctx) =>
        {
            string? adminId = ctx.User.FindFirst("sub")?.Value
                              ?? ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            return Results.Ok(new
            {
                adminId,
                status = "ok",
            });
        });

        group.MapPost("/engine/reload", async (AdminEngineService engine, CancellationToken ct) =>
        {
            var (version, reloadedAt) = await engine.ReloadAllAsync(ct);
            return Results.Ok(new
            {
                version,
                reloadedAt,
            });
        });
    }
}
