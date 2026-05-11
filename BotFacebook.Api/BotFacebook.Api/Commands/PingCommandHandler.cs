namespace BotFacebook.Api.Commands;

public sealed class PingCommandHandler : IBotCommandHandler
{
    public string Name => "ping";

    public IReadOnlyCollection<string> Aliases { get; } = new[] { "ping" };

    public Task HandleAsync(BotCommandContext context, CancellationToken cancellationToken = default)
    {
        return context.SendAsync("Pong!", cancellationToken);
    }
}