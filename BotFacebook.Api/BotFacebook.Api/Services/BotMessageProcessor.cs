using BotFacebook.Api.Commands;
using BotFacebook.Api.Configuration;
using BotFacebook.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace BotFacebook.Api.Services;

public interface IBotMessageProcessor
{
    Task ProcessAsync(FacebookWebhookPayload payload, CancellationToken cancellationToken = default);
}

public sealed class BotMessageProcessor : IBotMessageProcessor
{
    private readonly MongoDbContext _mongo;
    private readonly FacebookGraphService _facebook;
    private readonly GeminiService _gemini;
    private readonly BotCommandDispatcher _dispatcher;
    private readonly FacebookOptions _facebookOptions;
    private readonly BotOptions _botOptions;
    private readonly ILogger<BotMessageProcessor> _logger;

    public BotMessageProcessor(
        MongoDbContext mongo,
        FacebookGraphService facebook,
        GeminiService gemini,
        BotCommandDispatcher dispatcher,
        IOptions<FacebookOptions> facebookOptions,
        IOptions<BotOptions> botOptions,
        ILogger<BotMessageProcessor> logger)
    {
        _mongo = mongo;
        _facebook = facebook;
        _gemini = gemini;
        _dispatcher = dispatcher;
        _facebookOptions = facebookOptions.Value;
        _botOptions = botOptions.Value;
        _logger = logger;
    }

    public async Task ProcessAsync(FacebookWebhookPayload payload, CancellationToken cancellationToken = default)
    {
        foreach (var entry in payload.Entry ?? new List<FacebookWebhookEntry>())
        {
            foreach (var eventItem in entry.Messaging ?? new List<FacebookMessagingEvent>())
            {
                try
                {
                    await ProcessEventAsync(eventItem, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing webhook event");
                }
            }
        }
    }

    private async Task ProcessEventAsync(FacebookMessagingEvent eventItem, CancellationToken cancellationToken)
    {
        var senderId = eventItem.Sender?.Id;
        var recipientId = eventItem.Recipient?.Id;
        var messageText = eventItem.Message?.Text?.Trim();

        if (string.IsNullOrWhiteSpace(senderId) || string.IsNullOrWhiteSpace(messageText))
        {
            return;
        }

        await StoreMessageAsync(senderId, messageText, cancellationToken);

        var isCommand = messageText.StartsWith('/');
        var isHoi = messageText.StartsWith("/hoi ", StringComparison.OrdinalIgnoreCase);
        var isDirectToPage = await IsDirectToPageAsync(recipientId, cancellationToken);

        if (!isCommand && !isDirectToPage && !isHoi)
        {
            return;
        }

        string commandName;
        string[] args;

        if (isHoi)
        {
            commandName = "ask";
            args = SplitArgs(messageText[4..]);
        }
        else if (isCommand)
        {
            var parts = SplitArgs(messageText);
            commandName = parts.Length > 0 ? parts[0][1..] : string.Empty;
            args = parts.Skip(1).ToArray();
        }
        else
        {
            commandName = "ask";
            args = SplitArgs(messageText);
        }

        var context = new BotCommandContext
        {
            SenderId = senderId,
            RecipientId = recipientId,
            MessageText = messageText,
            Args = args,
            Mongo = _mongo,
            Facebook = _facebook,
            Gemini = _gemini,
            FacebookOptions = _facebookOptions,
            BotOptions = _botOptions,
            Logger = _logger
        };

        await _dispatcher.DispatchAsync(commandName, args, context, cancellationToken);
    }

    private async Task StoreMessageAsync(string senderId, string messageText, CancellationToken cancellationToken)
    {
        if (!_mongo.IsConfigured)
        {
            return;
        }

        try
        {
            var senderName = await _facebook.GetUserNameAsync(senderId, cancellationToken);
            var message = new MessageDocument
            {
                SenderId = senderId,
                SenderName = senderName,
                Text = messageText,
                CreatedAt = DateTime.UtcNow
            };

            await _mongo.Messages.InsertOneAsync(message, cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to store incoming message");
        }
    }

    private async Task<bool> IsDirectToPageAsync(string? recipientId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(recipientId))
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(_facebookOptions.PageId))
        {
            return string.Equals(recipientId, _facebookOptions.PageId, StringComparison.OrdinalIgnoreCase);
        }

        var fetchedPageId = await _facebook.GetPageIdAsync(cancellationToken);
        return !string.IsNullOrWhiteSpace(fetchedPageId) && string.Equals(recipientId, fetchedPageId, StringComparison.OrdinalIgnoreCase);
    }

    private static string[] SplitArgs(string text)
    {
        return text
            .Trim()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }
}