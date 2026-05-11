import { CommandContext } from './types';

export async function handle(ctx: CommandContext) {
  try {
    const hour = Number(
      new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
    );
    const minute = Number(new Intl.DateTimeFormat('en-US', { minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
    const second = Number(new Intl.DateTimeFormat('en-US', { second: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
    let exclaim = '';
    if (hour >= 0 && hour < 5) exclaim = 'Ngủ đi các con nghiện.';
    else if (hour >= 5 && hour < 7) exclaim = 'Sáng rồi, cà phê rồi leo rank.';
    else if (hour >= 7 && hour < 10) exclaim = 'Dậy leo rank thôi!';
    else if (hour === 12) exclaim = 'Trưa rồi, ăn tí rồi gank tiếp.';
    else if (hour >= 18 && hour < 22) exclaim = 'Tối rồi, chuẩn bị combat.';
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
    await ctx.send(`Bây giờ là ${timeStr}. ${exclaim}`);
  } catch (e) {
    await ctx.send('Không thể lấy thời gian hiện tại.');
  }
}
