using System.Text;
using System.Text.RegularExpressions;
using BotFacebook.Api.Models;
using MongoDB.Bson;
using MongoDB.Driver;

namespace BotFacebook.Api.Commands;

public sealed class AskCommandHandler : IBotCommandHandler
{
    public string Name => "ask";

    public IReadOnlyCollection<string> Aliases { get; } = new[] { "ask" };

    public async Task HandleAsync(BotCommandContext context, CancellationToken cancellationToken = default)
    {
        var question = string.Join(' ', context.Args ?? Array.Empty<string>()).Trim();
        if (string.IsNullOrWhiteSpace(question))
        {
            await context.SendAsync("Usage: /ask <question>", cancellationToken);
            return;
        }

        try
        {
            var contexts = await BuildContextsAsync(context, question, cancellationToken);
            var systemPrompt = BuildSystemPrompt(contexts, question);
            var answer = await context.Gemini.GenerateAnswerAsync(systemPrompt, contexts, question, cancellationToken);
            await context.SendAsync(answer, cancellationToken);
        }
        catch (Exception ex)
        {
            context.Logger.LogError(ex, "ask error");
            await context.SendAsync("Server Động đang bị lag, đợi anh em gank xong tí trả lời nhé!", cancellationToken);
        }
    }

    private static async Task<IReadOnlyList<string>> BuildContextsAsync(BotCommandContext context, string question, CancellationToken cancellationToken)
    {
        if (!context.Mongo.IsConfigured)
        {
            return Array.Empty<string>();
        }

        var tokens = Regex.Matches(question.ToLowerInvariant(), "[\\p{L}\\p{N}_]+")
            .Select(match => match.Value)
            .Where(token => !string.IsNullOrWhiteSpace(token))
            .Take(10)
            .ToArray();

        var keywordFilter = Builders<KnowledgeDocument>.Filter.AnyIn(document => document.Keywords, tokens);
        var keywordMatches = tokens.Length > 0
            ? await context.Mongo.Knowledge.Find(keywordFilter).Limit(5).ToListAsync(cancellationToken)
            : new List<KnowledgeDocument>();

        if (keywordMatches.Count > 0)
        {
            return keywordMatches.Select(document => $"{document.Topic}\n{document.Content}").ToList();
        }

        var escaped = Regex.Escape(question);
        var regexFilter = Builders<KnowledgeDocument>.Filter.Or(
            Builders<KnowledgeDocument>.Filter.Regex(document => document.Topic, new BsonRegularExpression(escaped, "i")),
            Builders<KnowledgeDocument>.Filter.Regex(document => document.Content, new BsonRegularExpression(escaped, "i")));

        var regexMatches = await context.Mongo.Knowledge.Find(regexFilter).Limit(3).ToListAsync(cancellationToken);
        return regexMatches.Select(document => $"{document.Topic}\n{document.Content}").ToList();
    }

    private static string BuildSystemPrompt(IReadOnlyCollection<string> contexts, string question)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Bạn là Trùm Động, đại diện DNE (Động Nghiệp Esport).");
        builder.AppendLine("Gọi người dùng là Nghiện hữu hoặc Anh em.");
        builder.AppendLine("Trả lời lầy lội, dùng từ ngữ game thủ, hài hước.");
        builder.AppendLine("Dựa vào dữ liệu sau để trả lời:");
        builder.AppendLine(contexts.Count > 0 ? string.Join("\n\n---\n\n", contexts) : "Không có dữ liệu liên quan.");
        builder.AppendLine();
        builder.AppendLine($"User hỏi: {question}");
        builder.AppendLine("Trả lời:");
        return builder.ToString();
    }
}