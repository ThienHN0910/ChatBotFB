using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using BotFacebook.Api.Configuration;

namespace BotFacebook.Api.Controllers;

[ApiController]
[Route("api/logout")]
public sealed class LogoutController : ControllerBase
{
    private readonly IOptions<AuthOptions> _authOptions;

    public LogoutController(IOptions<AuthOptions> authOptions)
    {
        _authOptions = authOptions;
    }

    [HttpGet]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("token", new CookieOptions { Path = "/", SameSite = SameSiteMode.None, Secure = Request.IsHttps });
        Response.Cookies.Delete("oauth_state", new CookieOptions { Path = "/", SameSite = SameSiteMode.Lax, Secure = Request.IsHttps });
        var frontendBaseUrl = _authOptions.Value.FrontendBaseUrl.TrimEnd('/');
        return Redirect($"{frontendBaseUrl}/dashboard");
    }
}