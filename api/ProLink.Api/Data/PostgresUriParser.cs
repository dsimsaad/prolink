using Npgsql;

namespace ProLink.Api.Data;

// Converts a Supabase session-pooler database URI into an Npgsql connection string.
// Unescapes URL-encoded credentials and enforces SSL.
public static class PostgresUriParser
{
    public static string ParseConnectionString(string? databaseUrl)
    {
        if (string.IsNullOrWhiteSpace(databaseUrl))
        {
            return string.Empty;
        }

        string trimmed = databaseUrl.Trim();
        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out Uri? uri)
            || (!string.Equals(uri.Scheme, "postgres", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(uri.Scheme, "postgresql", StringComparison.OrdinalIgnoreCase)))
        {
            throw new ArgumentException("DATABASE_URL must be a valid Postgres URI.");
        }

        string user = string.Empty;
        string secretSegment = string.Empty;

        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            int colonIndex = uri.UserInfo.IndexOf(':');
            if (colonIndex >= 0)
            {
                user = Uri.UnescapeDataString(uri.UserInfo[..colonIndex]);
                secretSegment = Uri.UnescapeDataString(uri.UserInfo[(colonIndex + 1)..]);
            }
            else
            {
                user = Uri.UnescapeDataString(uri.UserInfo);
            }
        }

        string database = uri.AbsolutePath.Trim('/');
        if (string.IsNullOrEmpty(database))
        {
            database = "postgres";
        }

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = Uri.UnescapeDataString(database),
            Username = user,
            SslMode = SslMode.Require,
            Pooling = true,
            MaxPoolSize = 20,
        };

        if (!string.IsNullOrEmpty(secretSegment))
        {
            builder.Password = secretSegment;
        }

        return builder.ConnectionString;
    }
}
