using MongoDB.Driver;
using BotFacebook.Api.Models;

namespace BotFacebook.Api.Commands;

public sealed class HistoryCommandHandler : IBotCommandHandler
{
    public string Name => "history";

    public IReadOnlyCollection<string> Aliases { get; } = new[] { "history" };

    public async Task HandleAsync(BotCommandContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!context.Mongo.IsConfigured)
            {
                await context.SendAsync("MongoDB chưa được cấu hình.", cancellationToken);
                return;
            }

            var filter = Builders<MessageDocument>.Filter.Eq(x => x.SenderId, context.SenderId);
            var messages = await context.Mongo.Messages.Find(filter).SortByDescending(x => x.CreatedAt).Limit(10).ToListAsync(cancellationToken);

            if (messages.Count == 0)
            {
                await context.SendAsync("Không tìm thấy lịch sử nhắn tin của bạn.", cancellationToken);
                return;
            }

            var lines = messages.Select(message =>
            {
                var timestamp = TimeZoneInfo.ConvertTimeFromUtc(message.CreatedAt, GetVietnamTimeZone()).ToString("g");
                return $"{timestamp}: {message.Text[..Math.Min(message.Text.Length, 200)]}";
            });

            await context.SendAsync($"Lịch sử tin nhắn của bạn:\n{string.Join('\n', lines)}", cancellationToken);
        }
        catch (Exception ex)
        {
            context.Logger.LogError(ex, "history error");
            await context.SendAsync("Lấy lịch sử thất bại.", cancellationToken);
        }
    }

    private static TimeZoneInfo GetVietnamTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        }
        catch
        {
            return TimeZoneInfo.Utc;
        }
    }
}