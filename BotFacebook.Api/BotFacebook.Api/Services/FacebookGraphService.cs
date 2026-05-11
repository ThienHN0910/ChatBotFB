using System.Text.Json;
using BotFacebook.Api.Configuration;
using Microsoft.Extensions.Options;
using System.Net.Http.Json;

namespace BotFacebook.Api.Services;

public sealed class FacebookGraphService
{
    private readonly HttpClient _httpClient;
    private readonly FacebookOptions _options;
    private readonly ILogger<FacebookGraphService> _logger;
    private readonly SemaphoreSlim _pageIdLock = new(1, 1);
    private string? _cachedPageId;

    public FacebookGraphService(HttpClient httpClient, IOptions<FacebookOptions> options, ILogger<FacebookGraphService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendTextMessageAsync(string psid, string text, CancellationToken cancellationToken = default)
    {
        EnsureConfigured();

        var requestUri = $"https://graph.facebook.com/{_options.GraphApiVersion}/me/messages?access_token={Uri.EscapeDataString(_options.PageAccessToken)}";
        var payload = new
        {
            recipient = new { id = psid },
            message = new { text }
        };

        using var response = await _httpClient.PostAsJsonAsync(requestUri, payload, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Facebook send message failed ({StatusCode}): {Body}", response.StatusCode, errorBody);
            response.EnsureSuccessStatusCode();
        }
    }

    public async Task<string?> GetUserNameAsync(string psid, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.PageAccessToken))
        {
            return null;
        }

        var requestUri = $"{_options.GraphApiVersion}/{psid}?fields=name&access_token={Uri.EscapeDataString(_options.PageAccessToken)}";
        try
        {
            using var response = await _httpClient.GetAsync(requestUri, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            return document.RootElement.TryGetProperty("name", out var nameElement) ? nameElement.GetString() : null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch Facebook user name for {Psid}", psid);
            return null;
        }
    }

    public async Task<string?> GetPageIdAsync(CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(_options.PageId))
        {
            return _options.PageId;
        }

        if (string.IsNullOrWhiteSpace(_options.PageAccessToken))
        {
            return null;
        }

        if (_cachedPageId is not null)
        {
            return _cachedPageId;
        }

        await _pageIdLock.WaitAsync(cancellationToken);
        try
        {
            if (_cachedPageId is not null)
            {
                return _cachedPageId;
            }

            var requestUri = $"{_options.GraphApiVersion}/me?access_token={Uri.EscapeDataString(_options.PageAccessToken)}";
            using var response = await _httpClient.GetAsync(requestUri, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            _cachedPageId = document.RootElement.TryGetProperty("id", out var idElement) ? idElement.GetString() : null;
            return _cachedPageId;
        }
        finally
        {
            _pageIdLock.Release();
        }
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.PageAccessToken))
        {
            throw new InvalidOperationException("Facebook page access token is not configured.");
        }
    }
}