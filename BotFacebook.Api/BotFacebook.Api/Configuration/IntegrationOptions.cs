namespace BotFacebook.Api.Configuration;

public sealed class MongoOptions
{
    public const string SectionName = "Mongo";

    public string ConnectionString { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = "dne_chatbot";
}

public sealed class FacebookOptions
{
    public const string SectionName = "Facebook";

    public string PageAccessToken { get; set; } = string.Empty;
    public string PageId { get; set; } = string.Empty;
    public string GraphApiVersion { get; set; } = "v19.0";
    public string GroupLink { get; set; } = string.Empty;
    public string PageLink { get; set; } = string.Empty;
    public string DiscordLink { get; set; } = string.Empty;
    public string WebsiteLink { get; set; } = string.Empty;
}

public sealed class GeminiOptions
{
    public const string SectionName = "Gemini";

    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gemini-1.5-flash";
}

public sealed class WebhookOptions
{
    public const string SectionName = "Webhook";

    public string VerifyToken { get; set; } = string.Empty;
}

public sealed class BotOptions
{
    public const string SectionName = "Bot";

    public string TimeZoneId { get; set; } = "Asia/Ho_Chi_Minh";
}