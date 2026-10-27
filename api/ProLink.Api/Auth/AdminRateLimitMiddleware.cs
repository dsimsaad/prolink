using System.Security.Claims;
using System.Text.Json;
using ProLink.Engine.RateLimiting;

namespace ProLink.Api.Auth;

// Applies SlidingWindowLimiter to all /admin/* endpoints, keyed by authenticated user ID or client IP.
public sealed class AdminRateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly SlidingWindowLimiter _limiter;

    public AdminRateLimitMiddleware(RequestDelegate next, SlidingWindowLimiter limiter)
    {
        _next = next;
        _limiter = limiter;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Path.StartsWithSegments("/admin", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        string key = ResolveCallerKey(context);
        if (_limiter.TryAcquire(key, out int retryAfterSeconds))
        {
            await _next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.Response.Headers["Retry-After"] = retryAfterSeconds.ToString();
        context.Response.ContentType = "application/json";

        var payload = new
        {
            code = "rate_limit_exceeded",
            message = $"Too many requests. Please retry after {retryAfterSeconds} seconds.",
            retryAfterSeconds,
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
    }

    private static string ResolveCallerKey(HttpContext context)
    {
        if (context.User?.Identity?.IsAuthenticated == true)
        {
            string? sub = context.User.FindFirst("sub")?.Value
                          ?? context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrWhiteSpace(sub))
            {
                return "user:" + sub.Trim();
            }
        }

        string? forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            int commaIndex = forwarded.IndexOf(',');
            string firstHop = commaIndex >= 0 ? forwarded[..commaIndex].Trim() : forwarded.Trim();
            if (firstHop.Length > 0 && firstHop.Length <= 64)
            {
                return "ip:" + firstHop;
            }
        }

        string remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return "ip:" + remoteIp;
    }
}
