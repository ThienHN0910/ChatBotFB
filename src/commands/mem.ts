import mongoose from 'mongoose';
import { CommandContext } from './types';

export async function handle(ctx: CommandContext) {
  try {
    if (!ctx.connectDB || !ctx.Message) return true;
    if (mongoose.connection.readyState !== 1) await ctx.connectDB();
    const distinct = await ctx.Message.distinct('senderId');
    await ctx.send(`Số thành viên đã từng nhắn cho bot: ${distinct.length}`);
    return true;
  } catch (e) {
    console.error('mem error', e);
    await ctx.send('Lấy số thành viên thất bại.');
    return true;
  }
}
