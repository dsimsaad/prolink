using System.Text;
using Microsoft.IdentityModel.Tokens;

public class SupabaseKeys
{
    private readonly string _jwksUrl;
    private readonly string? _legacySecret;
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(10) };
    private readonly object _lock = new();
    private JsonWebKeySet? _jwks;
    private DateTime _fetchedAt = DateTime.MinValue;

    public SupabaseKeys(string jwksUrl, string? legacySecret)
    {
        _jwksUrl = jwksUrl;
        _legacySecret = legacySecret;
    }

    public IEnumerable<SecurityKey> Resolve(string? kid)
    {
        // Legacy mode: shared secret (only when SUPABASE_JWT_SECRET is set)
        if (!string.IsNullOrEmpty(_legacySecret))
            return new[] { new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_legacySecret)) };

        lock (_lock)
        {
            var age = DateTime.UtcNow - _fetchedAt;
            var unknownKid = _jwks != null && kid != null
                             && !_jwks.Keys.Any(k => k.Kid == kid) && age > TimeSpan.FromMinutes(1);
            if (_jwks == null || age > TimeSpan.FromHours(1) || unknownKid)
            {
                var json = _http.GetStringAsync(_jwksUrl).GetAwaiter().GetResult();
                _jwks = new JsonWebKeySet(json);
                _fetchedAt = DateTime.UtcNow;
            }
            return _jwks.GetSigningKeys();
        }
    }
}
