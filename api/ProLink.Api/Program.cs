using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Render sets PORT; bind to 0.0.0.0 (not localhost)
var port = Environment.GetEnvironmentVariable("PORT") ?? "5080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

var origins = (builder.Configuration["ALLOWED_ORIGINS"] ?? "http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(o => o.AddPolicy("web", p => p
    .WithOrigins(origins)
    .WithHeaders("Authorization", "Content-Type")
    .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")));

var app = builder.Build();
app.UseCors("web");

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/me", (HttpContext ctx) => Results.Ok(new {
    id = ctx.User.FindFirst("sub")?.Value,
    email = ctx.User.FindFirst("email")?.Value
})).RequireAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "core-engine", time = DateTime.UtcNow }));

app.Run();

var supabaseUrl = (builder.Configuration["SUPABASE_URL"] ?? "").TrimEnd('/');
var issuer = $"{supabaseUrl}/auth/v1";
var keys = new SupabaseKeys($"{issuer}/.well-known/jwks.json",
                            builder.Configuration["SUPABASE_JWT_SECRET"]);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false; // keep claim names like "sub"
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = issuer,
            ValidateAudience = true, ValidAudience = "authenticated",
            ValidateLifetime = true, ClockSkew = TimeSpan.FromSeconds(30),
            ValidateIssuerSigningKey = true,
            IssuerSigningKeyResolver = (token, securityToken, kid, parameters) => keys.Resolve(kid)
        };
    });
builder.Services.AddAuthorization();
