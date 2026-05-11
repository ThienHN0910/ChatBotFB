namespace BotFacebook.Api.Commands;

public sealed class MeCommandHandler : IBotCommandHandler
{
    public string Name => "me";

    public IReadOnlyCollection<string> Aliases { get; } = new[] { "me" };

    public async Task HandleAsync(BotCommandContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var name = await context.Facebook.GetUserNameAsync(context.SenderId, cancellationToken);
            var text = $"Bạn là: {name ?? "Facebook user"}. ID của bạn: {context.SenderId}. Bạn đang ở trong Động Nghiện!";
            await context.SendAsync(text, cancellationToken);
        }
        catch
        {
            await context.SendAsync("Không thể lấy thông tin người dùng.", cancellationToken);
        }
    }
}