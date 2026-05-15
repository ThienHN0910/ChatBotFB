namespace BotFacebook.Api.Commands;

public sealed class HelpCommandHandler : IBotCommandHandler
{
    public string Name => "help";

    public IReadOnlyCollection<string> Aliases { get; } = new[] { "h", "help" };

    public Task HandleAsync(BotCommandContext context, CancellationToken cancellationToken = default)
    {
        var helpLines = new[]
        {
            "/ask <question> - Hỏi Gemini (RAG + AI)",
            "/time- Trả về giờ hệ thống (Asia/Ho_Chi_Minh)",
            "/ping - Kiểm tra độ trễ",
            "/fb, /link - Trả về links của Động",
            "/me - Hiển thị tên Facebook và ID của bạn",
            "/random - Tỉ lệ ngẫu nhiên (0-100%) hoặc /random <min> <max>",
            "/mem - Thống kê số người đã nhắn bot",
            "/top - Top gửi tin nhắn",
            "/history - Lịch sử 10 tin nhắn gần nhất",
            "/h, /help - Hiện trợ giúp"
        };

        return context.SendAsync(string.Join('\n', helpLines), cancellationToken);
    }
}