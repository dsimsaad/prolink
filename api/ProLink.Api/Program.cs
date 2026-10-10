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

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "core-engine", time = DateTime.UtcNow }));

app.Run();
