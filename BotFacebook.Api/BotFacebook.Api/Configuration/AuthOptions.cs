namespace BotFacebook.Api.Configuration;

public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    public string GoogleClientId { get; set; } = string.Empty;
    public string GoogleClientSecret { get; set; } = string.Empty;
    public string OAuthRedirect { get; set; } = "http://localhost:5000/api/auth/callback";
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
    public string SessionSecret { get; set; } = "change-me-in-prod";
}