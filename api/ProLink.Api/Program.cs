using System.IO.Pipelines;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.IdentityModel.Tokens;
using ProLink.Api.Auth;
using ProLink.Api.Data;
using ProLink.Api.Endpoints;
using ProLink.Api.Models;
using ProLink.Api.Services;
using ProLink.Engine.Abstractions;
using ProLink.Engine.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Render sets PORT; bind to 0.0.0.0 when running standalone
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

var origins = (builder.Configuration["ALLOWED_ORIGINS"] ?? "http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(o => o.AddPolicy("web", p => p
    .WithOrigins(origins)
    .WithHeaders("Authorization", "Content-Type")
    .WithMethods("GET", "POST", "PATCH", "OPTIONS")));

var supabaseUrl = (builder.Configuration["SUPABASE_URL"] ?? "").TrimEnd('/');
var issuer = $"{supabaseUrl}/auth/v1";
var keys = new SupabaseKeys($"{issuer}/.well-known/jwks.json",
                            builder.Configuration["SUPABASE_JWT_SECRET"]);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = "authenticated",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            ValidateIssuerSigningKey = true,
            IssuerSigningKeyResolver = (token, securityToken, kid, parameters) => keys.Resolve(kid)
        };
    });

string? rawDatabaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration["DATABASE_URL"]
    ?? builder.Configuration.GetConnectionString("DefaultConnection");
string npgsqlConnectionString = string.IsNullOrWhiteSpace(rawDatabaseUrl)
    ? string.Empty
    : PostgresUriParser.ParseConnectionString(rawDatabaseUrl);

builder.Services.AddHttpClient("Insight");
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddSingleton<IAdminRepository>(_ => new AdminRepository(npgsqlConnectionString));
builder.Services.AddSingleton<AdminRoleCache>();
builder.Services.AddSingleton<IAuthorizationHandler, AdminAuthorizationHandler>();
builder.Services.AddSingleton<IAuthorizationHandler, CustomerAuthorizationHandler>();
builder.Services.AddSingleton<IAuthorizationHandler, ApprovedProfessionalAuthorizationHandler>();
builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, ProLinkAuthorizationResultHandler>();
builder.Services.AddSingleton<IJobMatcher, FallbackMatcher>();
builder.Services.AddSingleton<AdminEngineService>();

builder.Services.AddSingleton(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    int permitLimit = int.TryParse(config["RateLimiting:PermitLimit"], out int pLimit) && pLimit > 0
        ? pLimit
        : 60;
    int windowSeconds = int.TryParse(config["RateLimiting:WindowSeconds"], out int wSec) && wSec > 0
        ? wSec
        : 60;
    return new SlidingWindowLimiter(permitLimit, TimeSpan.FromSeconds(windowSeconds), sp.GetRequiredService<IClock>());
});

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("Admin", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.AddRequirements(new AdminRequirement());
    })
    .AddPolicy("Customer", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.AddRequirements(new CustomerRequirement());
    })
    .AddPolicy("ApprovedProfessional", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.AddRequirements(new ApprovedProfessionalRequirement());
    });

var app = builder.Build();

app.UseExceptionHandler(errApp =>
{
    errApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        var payload = new ApiErrorResponse("internal_error", "An unexpected server error occurred.");
        await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
    });
});

app.Use(async (context, next) =>
{
    var bodyFeature = context.Features.Get<IHttpResponseBodyFeature>();
    if (bodyFeature is not null)
    {
        var wrapped = new CompatibleResponseBodyFeature(bodyFeature);
        context.Features.Set<IHttpResponseBodyFeature>(wrapped);
        try
        {
            await next();
            await wrapped.FlushAsync();
        }
        finally
        {
            context.Features.Set<IHttpResponseBodyFeature>(bodyFeature);
        }
        return;
    }

    await next();
});

app.UseCors("web");
app.UseAuthentication();
app.UseMiddleware<AdminRateLimitMiddleware>();
app.UseAuthorization();

app.MapGet("/me", (HttpContext ctx) => Results.Ok(new
{
    id = ctx.User.FindFirst("sub")?.Value,
    email = ctx.User.FindFirst("email")?.Value
})).RequireAuthorization();

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    service = "core-engine",
    time = DateTime.UtcNow
}));

app.MapAdminSystemEndpoints();
app.MapAdminQueueAndAuditEndpoints();
app.MapAdminSearchEndpoints();
app.MapAdminAnalyticsEndpoints();
app.MapAdminJobsAndDisputesEndpoints();
app.MapCustomerJobsEndpoints();
app.MapProfessionalEndpoints();

app.Run();

public partial class Program
{
    private sealed class CompatibleResponseBodyFeature : IHttpResponseBodyFeature
    {
        private readonly IHttpResponseBodyFeature _inner;
        private PipeWriter? _writer;

        public CompatibleResponseBodyFeature(IHttpResponseBodyFeature inner)
        {
            _inner = inner;
        }

        public Stream Stream => _inner.Stream;

        public PipeWriter Writer => _writer ??= PipeWriter.Create(
            _inner.Stream,
            new StreamPipeWriterOptions(leaveOpen: true));

        public void DisableBuffering() => _inner.DisableBuffering();

        public Task StartAsync(CancellationToken cancellationToken = default) =>
            _inner.StartAsync(cancellationToken);

        public Task SendFileAsync(string path, long offset, long? count, CancellationToken cancellationToken = default) =>
            _inner.SendFileAsync(path, offset, count, cancellationToken);

        public async Task FlushAsync()
        {
            if (_writer is not null)
            {
                await _writer.FlushAsync();
            }
        }

        public async Task CompleteAsync()
        {
            await FlushAsync();
            await _inner.CompleteAsync();
        }
    }
}
