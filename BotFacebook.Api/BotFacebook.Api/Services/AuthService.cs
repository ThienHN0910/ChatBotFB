using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using BotFacebook.Api.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace BotFacebook.Api.Services;

public sealed class AuthService
{
    private readonly HttpClient _httpClient;
    private readonly AuthOptions _options;
    private readonly ILogger<AuthService> _logger;
    private readonly JwtSecurityTokenHandler _tokenHandler = new();

    public AuthService(HttpClient httpClient, IOptions<AuthOptions> options, ILogger<AuthService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public string BuildGoogleAuthUrl(string state)
    {
        EnsureGoogleConfigured();

        var parameters = new Dictionary<string, string>
        {
            ["client_id"] = _options.GoogleClientId,
            ["redirect_uri"] = _options.OAuthRedirect,
            ["response_type"] = "code",
            ["scope"] = "openid email profile",
            ["access_type"] = "offline",
            ["prompt"] = "consent",
            ["state"] = state
        };

        var query = string.Join('&', parameters.Select(pair => $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value)}"));
        return $"https://accounts.google.com/o/oauth2/v2/auth?{query}";
    }

    public async Task<string?> ExchangeCodeForAccessTokenAsync(string code, CancellationToken cancellationToken = default)
    {
        EnsureGoogleConfigured();

        using var response = await _httpClient.PostAsync(
            "https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = _options.GoogleClientId,
                ["client_secret"] = _options.GoogleClientSecret,
                ["redirect_uri"] = _options.OAuthRedirect,
                ["grant_type"] = "authorization_code"
            }),
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Google token exchange failed ({StatusCode}): {Body}", response.StatusCode, error);
            return null;
        }

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        return document.RootElement.TryGetProperty("access_token", out var tokenElement) ? tokenElement.GetString() : null;
    }

    public async Task<(string? Email, string? Name)> GetGoogleUserInfoAsync(string accessToken, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v2/userinfo?alt=json");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Google userinfo failed ({StatusCode}): {Body}", response.StatusCode, error);
            return (null, null);
        }

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var root = document.RootElement;
        return (
            root.TryGetProperty("email", out var emailElement) ? emailElement.GetString() : null,
            root.TryGetProperty("name", out var nameElement) ? nameElement.GetString() : null);
    }

    public string CreateSessionToken(string email, string role)
    {
        var key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(_options.SessionSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role)
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials);

        return _tokenHandler.WriteToken(token);
    }

    public SessionUser? ValidateSessionToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        try
        {
            var parameters = new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(_options.SessionSecret)),
                ClockSkew = TimeSpan.FromMinutes(2)
            };

            var principal = _tokenHandler.ValidateToken(token, parameters, out _);
            var email = principal.FindFirstValue(ClaimTypes.Email);
            var role = principal.FindFirstValue(ClaimTypes.Role);
            if (string.IsNullOrWhiteSpace(email))
            {
                return null;
            }

            return new SessionUser(email, role ?? "user");
        }
        catch
        {
            return null;
        }
    }

    public static string GenerateState()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
    }

    private void EnsureGoogleConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.GoogleClientId) || string.IsNullOrWhiteSpace(_options.GoogleClientSecret))
        {
            throw new InvalidOperationException("Google OAuth client settings are not configured.");
        }
    }
}

public sealed record SessionUser(string Email, string Role);