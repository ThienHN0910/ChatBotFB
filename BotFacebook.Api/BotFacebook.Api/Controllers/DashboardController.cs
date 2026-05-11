using System.Text.Json;
using BotFacebook.Api.Models;
using BotFacebook.Api.Services;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace BotFacebook.Api.Controllers;

[ApiController]
[Route("dashboard")]
[Route("api/dashboard")]
public sealed class DashboardController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;
    private readonly MongoDbContext _mongo;
    private readonly AuthService _authService;

    public DashboardController(IWebHostEnvironment environment, MongoDbContext mongo, AuthService authService)
    {
        _environment = environment;
        _mongo = mongo;
        _authService = authService;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var sessionUser = GetSessionUser();
        var accept = Request.Headers.Accept.ToString();
        var requestedType = Request.Query["type"].ToString();

        if (string.IsNullOrWhiteSpace(requestedType) && accept.Contains("text/html", StringComparison.OrdinalIgnoreCase))
        {
            var html = sessionUser is null ? LoadTemplate("login.html") : LoadTemplate("dashboard.html").Replace("__EMAIL__", System.Net.WebUtility.HtmlEncode(sessionUser.Email));
            return Content(html, "text/html; charset=utf-8");
        }

        if (sessionUser is null)
        {
            return Unauthorized();
        }

        if (!_mongo.IsConfigured)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, "MongoDB is not configured");
        }

        if (string.Equals(requestedType, "users", StringComparison.OrdinalIgnoreCase))
        {
            var users = await _mongo.AuthorizedUsers.Find(FilterDefinition<AuthorizedUserDocument>.Empty).SortByDescending(x => x.CreatedAt).ToListAsync(cancellationToken);
            return Ok(users);
        }

        var docs = await _mongo.Knowledge.Find(FilterDefinition<KnowledgeDocument>.Empty).SortByDescending(x => x.CreatedAt).ToListAsync(cancellationToken);
        return Ok(docs);
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] JsonElement body, CancellationToken cancellationToken)
    {
        var sessionUser = GetSessionUser();
        if (sessionUser is null) return Unauthorized();
        if (!_mongo.IsConfigured) return StatusCode(StatusCodes.Status500InternalServerError, "MongoDB is not configured");

        var request = ToDictionary(body);
        if (!request.TryGetValue("type", out var type)) return BadRequest("Missing type");

        if (string.Equals(type, "users", StringComparison.OrdinalIgnoreCase))
        {
            if (!request.TryGetValue("email", out var email) || string.IsNullOrWhiteSpace(email)) return BadRequest("Missing email");
            var role = request.TryGetValue("role", out var requestedRole) && !string.IsNullOrWhiteSpace(requestedRole) ? requestedRole : "user";

            var created = new AuthorizedUserDocument
            {
                Email = email,
                Role = role,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _mongo.AuthorizedUsers.InsertOneAsync(created, cancellationToken: cancellationToken);
            return Created("", created);
        }

        if (!request.TryGetValue("topic", out var topic) || string.IsNullOrWhiteSpace(topic) || !request.TryGetValue("content", out var content) || string.IsNullOrWhiteSpace(content))
        {
            return BadRequest("Missing fields");
        }

        var keywords = request.TryGetValue("keywords", out var keywordValue)
            ? keywordValue.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList()
            : new List<string>();

        var createdKnowledge = new KnowledgeDocument
        {
            Topic = topic,
            Content = content,
            Keywords = keywords,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _mongo.Knowledge.InsertOneAsync(createdKnowledge, cancellationToken: cancellationToken);
        return Created("", createdKnowledge);
    }

    [HttpPut]
    public async Task<IActionResult> Put([FromBody] JsonElement body, CancellationToken cancellationToken)
    {
        var sessionUser = GetSessionUser();
        if (sessionUser is null) return Unauthorized();
        if (!_mongo.IsConfigured) return StatusCode(StatusCodes.Status500InternalServerError, "MongoDB is not configured");

        var request = ToDictionary(body);
        if (!request.TryGetValue("type", out var type)) return BadRequest("Missing type");
        if (!request.TryGetValue("_id", out var id) || string.IsNullOrWhiteSpace(id)) return BadRequest("Missing id");

        if (string.Equals(type, "users", StringComparison.OrdinalIgnoreCase))
        {
            var update = Builders<AuthorizedUserDocument>.Update
                .Set(x => x.Role, request.TryGetValue("role", out var role) && !string.IsNullOrWhiteSpace(role) ? role : "user")
                .Set(x => x.UpdatedAt, DateTime.UtcNow);
            var updated = await _mongo.AuthorizedUsers.FindOneAndUpdateAsync(x => x.Id == id, update, cancellationToken: cancellationToken);
            return Ok(updated);
        }

        var knowledgeUpdate = Builders<KnowledgeDocument>.Update
            .Set(x => x.Topic, request.TryGetValue("topic", out var topic) ? topic : string.Empty)
            .Set(x => x.Content, request.TryGetValue("content", out var content) ? content : string.Empty)
            .Set(x => x.Keywords, request.TryGetValue("keywords", out var keywords) ? keywords.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList() : new List<string>())
            .Set(x => x.UpdatedAt, DateTime.UtcNow);
        var updatedKnowledge = await _mongo.Knowledge.FindOneAndUpdateAsync(x => x.Id == id, knowledgeUpdate, cancellationToken: cancellationToken);
        return Ok(updatedKnowledge);
    }

    [HttpDelete]
    public async Task<IActionResult> Delete([FromBody] JsonElement body, CancellationToken cancellationToken)
    {
        var sessionUser = GetSessionUser();
        if (sessionUser is null) return Unauthorized();
        if (!_mongo.IsConfigured) return StatusCode(StatusCodes.Status500InternalServerError, "MongoDB is not configured");

        var request = ToDictionary(body);
        if (!request.TryGetValue("type", out var type) || !request.TryGetValue("_id", out var id) || string.IsNullOrWhiteSpace(id)) return BadRequest("Missing id");

        if (string.Equals(type, "users", StringComparison.OrdinalIgnoreCase))
        {
            await _mongo.AuthorizedUsers.DeleteOneAsync(x => x.Id == id, cancellationToken);
            return Ok("deleted");
        }

        await _mongo.Knowledge.DeleteOneAsync(x => x.Id == id, cancellationToken);
        return Ok("deleted");
    }

    private SessionUser? GetSessionUser()
    {
        return _authService.ValidateSessionToken(Request.Cookies["token"]);
    }

    private string LoadTemplate(string fileName)
    {
        var templatePath = Path.Combine(_environment.ContentRootPath, "Templates", fileName);
        return System.IO.File.Exists(templatePath) ? System.IO.File.ReadAllText(templatePath) : $"Missing template: {fileName}";
    }

    private static Dictionary<string, string> ToDictionary(JsonElement body)
    {
        var dictionary = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var property in body.EnumerateObject())
        {
            dictionary[property.Name] = property.Value.ValueKind switch
            {
                JsonValueKind.String => property.Value.GetString() ?? string.Empty,
                JsonValueKind.Number => property.Value.ToString(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Array => string.Join(',', property.Value.EnumerateArray().Select(x => x.GetString()).Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x!)),
                _ => property.Value.ToString()
            };
        }

        return dictionary;
    }
}