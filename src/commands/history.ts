import mongoose from 'mongoose';
import { CommandContext } from './types';

export async function handle(ctx: CommandContext) {
  try {
    if (!ctx.connectDB || !ctx.Message) return true;
    if (mongoose.connection.readyState !== 1) await ctx.connectDB();
    const msgs = await ctx.Message.find({ senderId: ctx.senderId }).sort({ createdAt: -1 }).limit(10).lean();
    if (!msgs || msgs.length === 0) {
      await ctx.send('Không tìm thấy lịch sử nhắn tin của bạn.');
      return true;
    }
    const lines = msgs.map((m: any) => `${new Date(m.createdAt || m._id.getTimestamp()).toLocaleString()}: ${String(m.text).slice(0, 200)}`);
    await ctx.send(`Lịch sử tin nhắn của bạn:\n${lines.join('\n')}`);
    return true;
  } catch (e) {
    console.error('history error', e);
    await ctx.send('Lấy lịch sử thất bại.');
    return true;
  }
}
