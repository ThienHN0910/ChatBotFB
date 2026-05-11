using BotFacebook.Api.Configuration;
using BotFacebook.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace BotFacebook.Api.Services;

public sealed class MongoDbContext
{
    private readonly MongoOptions _options;
    private readonly Lazy<IMongoDatabase> _database;

    public MongoDbContext(IOptions<MongoOptions> options)
    {
        _options = options.Value;
        _database = new Lazy<IMongoDatabase>(CreateDatabase, LazyThreadSafetyMode.ExecutionAndPublication);
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_options.ConnectionString);

    public IMongoCollection<KnowledgeDocument> Knowledge => GetDatabase().GetCollection<KnowledgeDocument>("knowledge_base");

    public IMongoCollection<MessageDocument> Messages => GetDatabase().GetCollection<MessageDocument>("messages");

    public IMongoCollection<AuthorizedUserDocument> AuthorizedUsers => GetDatabase().GetCollection<AuthorizedUserDocument>("authorized_users");

    private IMongoDatabase GetDatabase()
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException("MongoDB connection string is not configured.");
        }

        return _database.Value;
    }

    private IMongoDatabase CreateDatabase()
    {
        var client = new MongoClient(_options.ConnectionString);
        return client.GetDatabase(_options.DatabaseName);
    }
}