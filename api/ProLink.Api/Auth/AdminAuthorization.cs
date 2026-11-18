using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using ProLink.Api.Data;
using ProLink.Api.Models;
using ProLink.Engine.Abstractions;
using ProLink.Engine.Structures;

namespace ProLink.Api.Auth;

public sealed class AdminRequirement : IAuthorizationRequirement
{
}

public sealed class CustomerRequirement : IAuthorizationRequirement
{
}

public sealed class ApprovedProfessionalRequirement : IAuthorizationRequirement
{
}

// Thread-safe 60-second TTL LRU cache holding profile role and suspension state for JWT sub claims.
public sealed class AdminRoleCache
{
    private readonly TtlLruCache<Guid, AdminAuthRecord> _cache;
    private readonly object _sync = new();

    public AdminRoleCache(IClock clock, int capacity = 512)
    {
        _cache = new TtlLruCache<Guid, AdminAuthRecord>(capacity, TimeSpan.FromSeconds(60), clock);
    }

    public bool TryGet(Guid userId, out AdminAuthRecord record)
    {
        lock (_sync)
        {
            return _cache.TryGet(userId, out record!);
        }
    }

    public void Put(Guid userId, AdminAuthRecord record)
    {
        lock (_sync)
        {
            _cache.Put(userId, record);
        }
    }

    public void Clear()
    {
        lock (_sync)
        {
            _cache.Clear();
        }
    }
}

public sealed class AdminAuthorizationHandler : AuthorizationHandler<AdminRequirement>
{
    private readonly IAdminRepository _repository;
    private readonly AdminRoleCache _roleCache;

    public AdminAuthorizationHandler(IAdminRepository repository, AdminRoleCache roleCache)
    {
        _repository = repository;
        _roleCache = roleCache;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        AdminRequirement requirement)
    {
        if (context.User?.Identity?.IsAuthenticated != true)
        {
            return;
        }

        string? sub = context.User.FindFirst("sub")?.Value
                      ?? context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!Guid.TryParse(sub, out Guid userId))
        {
            return;
        }

        if (!_roleCache.TryGet(userId, out AdminAuthRecord? record) || record is null)
        {
            record = await _repository.GetUserAuthRecordAsync(userId);
            if (record is null)
            {
                return;
            }
            _roleCache.Put(userId, record);
        }

        if (string.Equals(record.Role, "admin", StringComparison.OrdinalIgnoreCase) && !record.IsSuspended)
        {
            context.Succeed(requirement);
        }
    }
}

public sealed class CustomerAuthorizationHandler : AuthorizationHandler<CustomerRequirement>
{
    private readonly IAdminRepository _repository;
    private readonly AdminRoleCache _roleCache;

    public CustomerAuthorizationHandler(IAdminRepository repository, AdminRoleCache roleCache)
    {
        _repository = repository;
        _roleCache = roleCache;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        CustomerRequirement requirement)
    {
        if (context.User?.Identity?.IsAuthenticated != true)
        {
            return;
        }

        string? sub = context.User.FindFirst("sub")?.Value
                      ?? context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!Guid.TryParse(sub, out Guid userId))
        {
            return;
        }

        if (!_roleCache.TryGet(userId, out AdminAuthRecord? record) || record is null)
        {
            record = await _repository.GetUserAuthRecordAsync(userId);
            if (record is null)
            {
                return;
            }
            _roleCache.Put(userId, record);
        }

        if (!record.IsSuspended)
        {
            context.Succeed(requirement);
        }
    }
}

public sealed class ApprovedProfessionalAuthorizationHandler : AuthorizationHandler<ApprovedProfessionalRequirement>
{
    private readonly IAdminRepository _repository;
    private readonly AdminRoleCache _roleCache;

    public ApprovedProfessionalAuthorizationHandler(IAdminRepository repository, AdminRoleCache roleCache)
    {
        _repository = repository;
        _roleCache = roleCache;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ApprovedProfessionalRequirement requirement)
    {
        if (context.User?.Identity?.IsAuthenticated != true)
        {
            return;
        }

        string? sub = context.User.FindFirst("sub")?.Value
                      ?? context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!Guid.TryParse(sub, out Guid userId))
        {
            return;
        }

        if (!_roleCache.TryGet(userId, out AdminAuthRecord? record) || record is null)
        {
            record = await _repository.GetUserAuthRecordAsync(userId);
            if (record is null)
            {
                return;
            }
            _roleCache.Put(userId, record);
        }

        if (!record.IsSuspended &&
            string.Equals(record.ProfessionalStatus, "approved", StringComparison.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
        }
    }
}

// Writes clear JSON error responses (with code "not_approved", "account_suspended", or "forbidden") on 403 Forbidden.
public sealed class ProLinkAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _defaultHandler = new();

    public async Task HandleAsync(
        RequestDelegate next,
        HttpContext context,
        AuthorizationPolicy policy,
        PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Forbidden)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";

            ApiErrorResponse payload;
            if (policy.Requirements.OfType<ApprovedProfessionalRequirement>().Any())
            {
                payload = new ApiErrorResponse(
                    "not_approved",
                    "Only approved, non-suspended professionals can access this endpoint.");
            }
            else if (policy.Requirements.OfType<CustomerRequirement>().Any())
            {
                payload = new ApiErrorResponse(
                    "account_suspended",
                    "Your account is currently suspended.");
            }
            else
            {
                payload = new ApiErrorResponse(
                    "forbidden",
                    "Administrator privileges are required to access this endpoint.");
            }

            await context.Response.WriteAsync(JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            }));
            return;
        }

        await _defaultHandler.HandleAsync(next, context, policy, authorizeResult);
    }
}
