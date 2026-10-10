using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── Port binding ──────────────────────────────────────────────────────────────
// Render injects PORT at runtime; bind to 0.0.0.0 (not localhost).
var port = Environment.GetEnvironmentVariable("PORT") ?? "5080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// ── CORS ──────────────────────────────────────────────────────────────────────
var origins = (builder.Configuration["ALLOWED_ORIGINS"] ?? "http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(o => o.AddPolicy("web", p => p
    .WithOrigins(origins)
    .WithHeaders("Authorization", "Content-Type")
    .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")));

// ── JWT authentication (Supabase) ─────────────────────────────────────────────
// SUPABASE_URL is required in production (e.g. https://xxxx.supabase.co).
// The JWKS endpoint is {SUPABASE_URL}/auth/v1/.well-known/jwks.json.
// Optionally set SUPABASE_JWT_SECRET to use the legacy shared-secret path.
var supabaseUrl = builder.Configuration["SUPABASE_URL"]
    ?? throw new InvalidOperationException("SUPABASE_URL is required.");

var jwksUrl = $"{supabaseUrl.TrimEnd('/')}/auth/v1/.well-known/jwks.json";
var supabaseKeys = new SupabaseKeys(jwksUrl, builder.Configuration["SUPABASE_JWT_SECRET"]);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"{supabaseUrl.TrimEnd('/')}/auth/v1",
            ValidateAudience = true,
            ValidAudience = "authenticated",
            ValidateLifetime = true,
            IssuerSigningKeyResolver = (_, _, kid, _) => supabaseKeys.Resolve(kid),
        };
    });

builder.Services.AddAuthorization();

// ── Swagger (development only) ────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "ProLink Core Engine", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = []
    });
});

var app = builder.Build();

// ── Middleware pipeline (order matters) ───────────────────────────────────────
app.UseCors("web");
app.UseAuthentication();
app.UseAuthorization();

// Swagger UI only in development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

// Health check — must not touch DB or auth; a failing health check blocks deploy.
app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    service = "core-engine",
    time = DateTime.UtcNow,
})).AllowAnonymous();

// Identity check — validates the Supabase JWT and echoes back safe claims.
// Call: GET /me  with  Authorization: Bearer <supabase-access-token>
app.MapGet("/me", (ClaimsPrincipal user) =>
{
    var sub = user.FindFirstValue(ClaimTypes.NameIdentifier)
           ?? user.FindFirstValue("sub");
    var email = user.FindFirstValue(ClaimTypes.Email)
              ?? user.FindFirstValue("email");
    var role = user.FindFirstValue("user_metadata.role")
             ?? user.FindFirstValue("role");

    return Results.Ok(new { sub, email, role });
}).RequireAuthorization();

app.Run();
