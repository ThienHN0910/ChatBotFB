using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BotFacebook.Api.Models;

[BsonIgnoreExtraElements]
public sealed class KnowledgeDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("topic")]
    public string Topic { get; set; } = string.Empty;

    [BsonElement("content")]
    public string Content { get; set; } = string.Empty;

    [BsonElement("keywords")]
    public List<string> Keywords { get; set; } = new();

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}