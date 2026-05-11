namespace BotFacebook.Api.Commands;

public sealed class FacebookLinksCommandHandler : IBotCommandHandler
{
    public string Name => "fb";

    public IReadOnlyCollection<string> Aliases { get; } = new[] { "fb", "link" };

    public Task HandleAsync(BotCommandContext context, CancellationToken cancellationToken = default)
    {
        var group = string.IsNullOrWhiteSpace(context.FacebookOptions.GroupLink)
            ? "https://www.facebook.com/messages/t/6141393309283013"
            : context.FacebookOptions.GroupLink;

        var page = string.IsNullOrWhiteSpace(context.FacebookOptions.PageLink)
            ? "https://www.facebook.com/profile.php?id=61589654425540"
            : context.FacebookOptions.PageLink;

        var discord = string.IsNullOrWhiteSpace(context.FacebookOptions.DiscordLink)
            ? "https://discord.gg/zKumexN9p"
            : context.FacebookOptions.DiscordLink;

        var site = context.FacebookOptions.WebsiteLink;
        var text = $"Links:\nGroup: {group}{(string.IsNullOrWhiteSpace(site) ? string.Empty : $"\nWebsite: {site}")}\nPage: {page}\nDiscord: {discord}";
        return context.SendAsync(text, cancellationToken);
    }
}