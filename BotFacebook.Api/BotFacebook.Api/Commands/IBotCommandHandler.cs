namespace BotFacebook.Api.Commands;

public interface IBotCommandHandler
{
    string Name { get; }

    IReadOnlyCollection<string> Aliases { get; }

    Task HandleAsync(BotCommandContext context, CancellationToken cancellationToken = default);
}