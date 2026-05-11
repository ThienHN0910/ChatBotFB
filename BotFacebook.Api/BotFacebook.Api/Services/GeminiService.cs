using System.Net.Http.Json;
using System.Text.Json;
using BotFacebook.Api.Configuration;
using Microsoft.Extensions.Options;

namespace BotFacebook.Api.Services;

public sealed class GeminiService
{
    private readonly HttpClient _httpClient;
    private readonly GeminiOptions _options;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(HttpClient httpClient, IOptions<GeminiOptions> options, ILogger<GeminiService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<string> GenerateAnswerAsync(string systemPrompt, IReadOnlyCollection<string> contexts, string question, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new InvalidOperationException("Gemini API key is not configured.");
        }

        var prompt = $"{systemPrompt}\n\nContext:\n{string.Join("\n\n---\n\n", contexts)}\n\nUser: {question}\n\nTrả lời:";
        var requestUri = $"v1beta/models/{_options.Model}:generateContent?key={Uri.EscapeDataString(_options.ApiKey)}";
        var payload = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[] { new { text = prompt } }
                }
            },
            generationConfig = new
            {
                temperature = 0.2,
                maxOutputTokens = 512
            }
        };

        using var response = await _httpClient.PostAsJsonAsync(requestUri, payload, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Gemini request failed ({StatusCode}): {Body}", response.StatusCode, errorBody);
            response.EnsureSuccessStatusCode();
        }

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        if (document.RootElement.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
        {
            var firstCandidate = candidates[0];
            if (firstCandidate.TryGetProperty("content", out var content) &&
                content.TryGetProperty("parts", out var parts) &&
                parts.GetArrayLength() > 0 &&
                parts[0].TryGetProperty("text", out var textElement))
            {
                var answer = textElement.GetString()?.Trim();
                if (!string.IsNullOrWhiteSpace(answer))
                {
                    return answer;
                }
            }
        }

        return "Trùm Động chưa biết trả lời câu này, thử hỏi khác đi nhé 🎮";
    }
}