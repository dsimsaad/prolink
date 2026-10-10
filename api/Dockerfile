FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish ProLink.Api/ProLink.Api.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /out .
# Port is injected at runtime by Render via the PORT env var.
# Program.cs reads PORT and binds to http://0.0.0.0:{PORT}.
# Do NOT set ASPNETCORE_URLS here — it would override the PORT binding.
EXPOSE 10000
ENTRYPOINT ["dotnet", "ProLink.Api.dll"]
