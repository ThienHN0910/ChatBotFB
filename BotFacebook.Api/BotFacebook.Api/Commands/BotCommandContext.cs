using BotFacebook.Api.Configuration;
using BotFacebook.Api.Services;
using Microsoft.Extensions.Logging;

namespace BotFacebook.Api.Commands;

public sealed class BotCommandContext
{
    public required string SenderId { get; init; }

    public string? RecipientId { get; init; }

    public required string MessageText { get; init; }

    public required string[] Args { get; set; }

    public required MongoDbContext Mongo { get; init; }

    public required FacebookGraphService Facebook { get; init; }

    public required GeminiService Gemini { get; init; }

    public required FacebookOptions FacebookOptions { get; init; }

    public required BotOptions BotOptions { get; init; }

    public required ILogger Logger { get; init; }

    public Task SendAsync(string text, CancellationToken cancellationToken = default)
    {
        return Facebook.SendTextMessageAsync(SenderId, text, cancellationToken);
    }
}