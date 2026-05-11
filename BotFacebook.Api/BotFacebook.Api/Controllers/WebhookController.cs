using BotFacebook.Api.Configuration;
using BotFacebook.Api.Models;
using BotFacebook.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace BotFacebook.Api.Controllers;

[ApiController]
[Route("webhook")]
public sealed class WebhookController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly WebhookOptions _webhookOptions;
    private readonly ILogger<WebhookController> _logger;

    public WebhookController(
        IWebHostEnvironment environment,
        IServiceScopeFactory scopeFactory,
        IOptions<WebhookOptions> webhookOptions,
        ILogger<WebhookController> logger)
    {
        _environment = environment;
        _scopeFactory = scopeFactory;
        _webhookOptions = webhookOptions.Value;
        _logger = logger;
    }

    [HttpGet]
    public IActionResult Verify([FromQuery(Name = "hub.mode")] string? mode, [FromQuery(Name = "hub.verify_token")] string? verifyToken, [FromQuery(Name = "hub.challenge")] string? challenge)
    {
        if (string.Equals(mode, "subscribe", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(verifyToken, _webhookOptions.VerifyToken, StringComparison.Ordinal))
        {
            return Ok(challenge);
        }

        return StatusCode(StatusCodes.Status403Forbidden);
    }

    [HttpPost]
    public IActionResult Receive([FromBody] FacebookWebhookPayload payload)
    {
        if (payload is null)
        {
            return BadRequest();
        }

        if (!string.Equals(payload?.Object, "page", StringComparison.OrdinalIgnoreCase))
        {
            return NotFound();
        }

        _ = Task.Run(async () =>
        {
            try
            {
                var webhookPayload = payload;
                using var scope = _scopeFactory.CreateScope();
                var processor = scope.ServiceProvider.GetRequiredService<IBotMessageProcessor>();
                await processor.ProcessAsync(webhookPayload!, CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Webhook background processing error");
            }
        });

        return Ok("EVENT_RECEIVED");
    }
}