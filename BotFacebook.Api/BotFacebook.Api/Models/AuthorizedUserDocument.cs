using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BotFacebook.Api.Models;

[BsonIgnoreExtraElements]
public sealed class AuthorizedUserDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("role")]
    public string Role { get; set; } = "admin";

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}