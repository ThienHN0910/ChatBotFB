namespace BotFacebook.Api.Commands;

public sealed class BotCommandDispatcher
{
    private readonly IReadOnlyDictionary<string, IBotCommandHandler> _handlers;

    public BotCommandDispatcher(IEnumerable<IBotCommandHandler> handlers)
    {
        _handlers = handlers
            .SelectMany(handler => handler.Aliases.Select(alias => (alias: alias.ToLowerInvariant(), handler)))
            .ToDictionary(pair => pair.alias, pair => pair.handler, StringComparer.OrdinalIgnoreCase);
    }

    public async Task<bool> DispatchAsync(string command, string[] args, BotCommandContext context, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(command))
        {
            return false;
        }

        if (_handlers.TryGetValue(command.ToLowerInvariant(), out var handler))
        {
            context.Args = args;
            await handler.HandleAsync(context, cancellationToken);
            return true;
        }

        await context.SendAsync("Lệnh không được hỗ trợ. Gõ /h để xem danh sách lệnh.", cancellationToken);
        return true;
    }
}