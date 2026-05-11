using System.Text.Json.Serialization;

namespace BotFacebook.Api.Models;

public sealed class FacebookWebhookPayload
{
    [JsonPropertyName("object")]
    public string? Object { get; set; }

    [JsonPropertyName("entry")]
    public List<FacebookWebhookEntry> Entry { get; set; } = new();
}

public sealed class FacebookWebhookEntry
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("time")]
    public long? Time { get; set; }

    [JsonPropertyName("messaging")]
    public List<FacebookMessagingEvent> Messaging { get; set; } = new();
}

public sealed class FacebookMessagingEvent
{
    [JsonPropertyName("sender")]
    public FacebookMessengerParticipant? Sender { get; set; }

    [JsonPropertyName("recipient")]
    public FacebookMessengerParticipant? Recipient { get; set; }

    [JsonPropertyName("message")]
    public FacebookMessagePayload? Message { get; set; }

    [JsonPropertyName("postback")]
    public FacebookPostbackPayload? Postback { get; set; }
}

public sealed class FacebookMessengerParticipant
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }
}

public sealed class FacebookMessagePayload
{
    [JsonPropertyName("mid")]
    public string? Mid { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }
}

public sealed class FacebookPostbackPayload
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("payload")]
    public string? Payload { get; set; }
}