import { CommandContext } from './types';

export async function handle(ctx: CommandContext) {
  try {
    const name = ctx.getUserName ? await ctx.getUserName(ctx.senderId) : null;
    const txt = `Bạn là: ${name || 'Facebook user'}. ID của bạn: ${ctx.senderId}. Bạn đang ở trong Động Nghiện!`;
    await ctx.send(txt);
  } catch (e) {
    await ctx.send('Không thể lấy thông tin người dùng.');
  }
}
