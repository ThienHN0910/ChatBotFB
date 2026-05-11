using MongoDB.Bson;
using MongoDB.Driver;
using BotFacebook.Api.Models;

namespace BotFacebook.Api.Commands;

public sealed class TopCommandHandler : IBotCommandHandler
{
    public string Name => "top";

    public IReadOnlyCollection<string> Aliases { get; } = new[] { "top" };

    public async Task HandleAsync(BotCommandContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!context.Mongo.IsConfigured)
            {
                await context.SendAsync("MongoDB chưa được cấu hình.", cancellationToken);
                return;
            }

            var pipeline = new[]
            {
                new BsonDocument("$group", new BsonDocument
                {
                    { "_id", "$senderId" },
                    { "count", new BsonDocument("$sum", 1) },
                    { "name", new BsonDocument("$first", "$senderName") }
                }),
                new BsonDocument("$sort", new BsonDocument("count", -1)),
                new BsonDocument("$limit", 10)
            };

            var results = await context.Mongo.Messages.Aggregate<BsonDocument>(pipeline).ToListAsync(cancellationToken);
            if (results.Count == 0)
            {
                await context.SendAsync("Chưa có dữ liệu thống kê.", cancellationToken);
                return;
            }

            var lines = results.Select((doc, index) =>
            {
                var name = doc.TryGetValue("name", out var nameValue) ? nameValue.AsString : doc["_id"].AsString;
                var count = doc.TryGetValue("count", out var countValue) ? countValue.ToInt32() : 0;
                return $"{index + 1}. {name}: {count} tin nhắn";
            });

            await context.SendAsync($"Top gửi tin nhắn:\n{string.Join('\n', lines)}", cancellationToken);
        }
        catch (Exception ex)
        {
            context.Logger.LogError(ex, "top error");
            await context.SendAsync("Lấy top thất bại.", cancellationToken);
        }
    }
}