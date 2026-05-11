namespace BotFacebook.Api.Commands;

public sealed class RandomCommandHandler : IBotCommandHandler
{
    public string Name => "random";

    public IReadOnlyCollection<string> Aliases { get; } = new[] { "random" };

    public Task HandleAsync(BotCommandContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var args = context.Args ?? Array.Empty<string>();
            if (args.Length >= 2 && int.TryParse(args[0], out var min) && int.TryParse(args[1], out var max))
            {
                var lower = Math.Min(min, max);
                var upper = Math.Max(min, max);
                var value = Random.Shared.Next(lower, upper + 1);
                return context.SendAsync($"Random: {value}", cancellationToken);
            }

            if (args.Length >= 2)
            {
                return context.SendAsync("Usage: /random <min> <max>", cancellationToken);
            }

            var percentage = Random.Shared.Next(0, 101);
            return context.SendAsync($"Tỉ lệ ngẫu nhiên: {percentage}%", cancellationToken);
        }
        catch
        {
            return context.SendAsync("Lỗi khi sinh số ngẫu nhiên.", cancellationToken);
        }
    }
}