using System.Runtime.InteropServices;

namespace BotFacebook.Api.Commands;

public sealed class TimeCommandHandler : IBotCommandHandler
{
    public string Name => "time";

    public IReadOnlyCollection<string> Aliases { get; } = new[] { "time", "gio", "keo" };

    public Task HandleAsync(BotCommandContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var timeZone = GetTimeZone(context.BotOptions.TimeZoneId);
            var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);

            var exclaim = now.Hour switch
            {
                >= 0 and < 5 => "Ngủ đi các con nghiện.",
                >= 5 and < 7 => "Sáng rồi, cà phê rồi leo rank.",
                >= 7 and < 10 => "Dậy leo rank thôi!",
                12 => "Trưa rồi, ăn tí rồi gank tiếp.",
                >= 18 and < 22 => "Tối rồi, chuẩn bị combat.",
                _ => string.Empty
            };

            var timeStr = now.ToString("HH:mm:ss");
            return context.SendAsync($"Bây giờ là {timeStr}. {exclaim}".Trim(), cancellationToken);
        }
        catch
        {
            return context.SendAsync("Không thể lấy thời gian hiện tại.", cancellationToken);
        }
    }

    private static TimeZoneInfo GetTimeZone(string timeZoneId)
    {
        var candidates = RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
            ? new[] { "SE Asia Standard Time", timeZoneId, "Asia/Ho_Chi_Minh" }
            : new[] { timeZoneId, "Asia/Ho_Chi_Minh", "SE Asia Standard Time" };

        foreach (var candidate in candidates.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(candidate);
            }
            catch
            {
                // ignore and continue
            }
        }

        return TimeZoneInfo.Utc;
    }
}