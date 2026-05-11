using BotFacebook.Api.Commands;
using BotFacebook.Api.Configuration;
using BotFacebook.Api.Services;

LoadDotEnvFiles();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.Configure<MongoOptions>(builder.Configuration.GetSection(MongoOptions.SectionName));
builder.Services.Configure<FacebookOptions>(builder.Configuration.GetSection(FacebookOptions.SectionName));
builder.Services.Configure<GeminiOptions>(builder.Configuration.GetSection(GeminiOptions.SectionName));
builder.Services.Configure<WebhookOptions>(builder.Configuration.GetSection(WebhookOptions.SectionName));
builder.Services.Configure<BotOptions>(builder.Configuration.GetSection(BotOptions.SectionName));
builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection(AuthOptions.SectionName));

var authOptions = builder.Configuration.GetSection(AuthOptions.SectionName).Get<AuthOptions>() ?? new AuthOptions();

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy
            .WithOrigins(authOptions.FrontendBaseUrl.TrimEnd('/'))
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddSingleton<MongoDbContext>();
builder.Services.AddHttpClient<FacebookGraphService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddHttpClient<GeminiService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.AddHttpClient<AuthService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddSingleton<IBotCommandHandler, HelpCommandHandler>();
builder.Services.AddSingleton<IBotCommandHandler, TimeCommandHandler>();
builder.Services.AddSingleton<IBotCommandHandler, PingCommandHandler>();
builder.Services.AddSingleton<IBotCommandHandler, AskCommandHandler>();
builder.Services.AddSingleton<IBotCommandHandler, MeCommandHandler>();
builder.Services.AddSingleton<IBotCommandHandler, RandomCommandHandler>();
builder.Services.AddSingleton<IBotCommandHandler, FacebookLinksCommandHandler>();
builder.Services.AddSingleton<IBotCommandHandler, MemoryStatsCommandHandler>();
builder.Services.AddSingleton<IBotCommandHandler, HistoryCommandHandler>();
builder.Services.AddSingleton<IBotCommandHandler, TopCommandHandler>();
builder.Services.AddSingleton<BotCommandDispatcher>();
builder.Services.AddSingleton<BotMessageProcessor>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("frontend");

app.MapGet("/", () => Results.Ok(new { service = "BotFacebook.Api", status = "alive" }));
app.MapControllers();

app.Run();

static void LoadDotEnvFiles()
{
    var current = new DirectoryInfo(Directory.GetCurrentDirectory());
    var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    for (var depth = 0; current is not null && depth < 5; depth++, current = current.Parent)
    {
        var envPath = Path.Combine(current.FullName, ".env");
        if (!visited.Add(envPath) || !File.Exists(envPath)) continue;

        foreach (var rawLine in File.ReadAllLines(envPath))
        {
            var line = rawLine.Trim();
            if (line.Length == 0 || line.StartsWith('#')) continue;

            var equalsIndex = line.IndexOf('=');
            if (equalsIndex <= 0) continue;

            var key = line[..equalsIndex].Trim();
            var value = line[(equalsIndex + 1)..].Trim().Trim('"').Trim('\'');
            if (string.IsNullOrWhiteSpace(key)) continue;

            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key)))
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }
}
