using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BotFacebook.Api.Models;

[BsonIgnoreExtraElements]
public sealed class MessageDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("senderId")]
    public string SenderId { get; set; } = string.Empty;

    [BsonElement("senderName")]
    public string? SenderName { get; set; }

    [BsonElement("text")]
    public string Text { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}