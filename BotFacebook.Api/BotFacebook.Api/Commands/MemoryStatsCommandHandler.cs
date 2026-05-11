using MongoDB.Driver;
using BotFacebook.Api.Models;

namespace BotFacebook.Api.Commands;

public sealed class MemoryStatsCommandHandler : IBotCommandHandler
{
    public string Name => "mem";

    public IReadOnlyCollection<string> Aliases { get; } = new[] { "mem" };

    public async Task HandleAsync(BotCommandContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!context.Mongo.IsConfigured)
            {
                await context.SendAsync("MongoDB chưa được cấu hình.", cancellationToken);
                return;
            }

            var distinct = await context.Mongo.Messages.DistinctAsync<string>("senderId", Builders<MessageDocument>.Filter.Empty, cancellationToken: cancellationToken);
            var items = await distinct.ToListAsync(cancellationToken);
            await context.SendAsync($"Số thành viên đã từng nhắn cho bot: {items.Count}", cancellationToken);
        }
        catch (Exception ex)
        {
            context.Logger.LogError(ex, "mem error");
            await context.SendAsync("Lấy số thành viên thất bại.", cancellationToken);
        }
    }
}