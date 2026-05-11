using Microsoft.AspNetCore.Mvc;

namespace BotFacebook.Api.Controllers;

[ApiController]
[Route("health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok", utc = DateTime.UtcNow });
}