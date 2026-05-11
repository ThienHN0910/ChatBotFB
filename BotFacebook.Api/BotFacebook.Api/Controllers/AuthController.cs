using BotFacebook.Api.Configuration;
using BotFacebook.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace BotFacebook.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly MongoDbContext _mongo;
    private readonly IOptions<AuthOptions> _authOptions;

    public AuthController(AuthService authService, MongoDbContext mongo, IOptions<AuthOptions> authOptions)
    {
        _authService = authService;
        _mongo = mongo;
        _authOptions = authOptions;
    }

    [HttpGet]
    public IActionResult Start()
    {
        var state = AuthService.GenerateState();
        Response.Cookies.Append(
            "oauth_state",
            state,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Path = "/",
                MaxAge = TimeSpan.FromMinutes(10)
            });

        return Redirect(_authService.BuildGoogleAuthUrl(state));
    }

    [HttpGet("callback")]
    public async Task<IActionResult> Callback([FromQuery] string? code, [FromQuery] string? state, CancellationToken cancellationToken)
    {
        var savedState = Request.Cookies["oauth_state"];
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state) || !string.Equals(state, savedState, StringComparison.Ordinal))
        {
            return BadRequest("Invalid OAuth state");
        }

        var accessToken = await _authService.ExchangeCodeForAccessTokenAsync(code, cancellationToken);
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            return StatusCode(StatusCodes.Status500InternalServerError, "No access token from Google");
        }

        var (email, _) = await _authService.GetGoogleUserInfoAsync(accessToken, cancellationToken);
        if (string.IsNullOrWhiteSpace(email))
        {
            return StatusCode(StatusCodes.Status500InternalServerError, "Google userinfo missing email");
        }

        if (!_mongo.IsConfigured)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, "MongoDB is not configured");
        }

        var found = await _mongo.AuthorizedUsers.Find(user => user.Email == email).FirstOrDefaultAsync(cancellationToken);
        if (found is null)
        {
            return StatusCode(StatusCodes.Status403Forbidden, "Truy cập bị từ chối - Email không có trong danh sách Admin");
        }

        var token = _authService.CreateSessionToken(email, found.Role);
        Response.Cookies.Append(
            "token",
            token,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.None,
                Path = "/",
                MaxAge = TimeSpan.FromDays(7)
            });

        var frontendBaseUrl = _authOptions.Value.FrontendBaseUrl.TrimEnd('/');
        return Redirect($"{frontendBaseUrl}/dashboard");
    }
}