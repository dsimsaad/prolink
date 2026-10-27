using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using ProLink.Api.Data;
using ProLink.Api.Models;
using ProLink.Engine.Abstractions;
using ProLink.Engine.Structures;

namespace ProLink.Api.Auth;

public sealed class AdminRequirement : IAuthorizationRequirement
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
