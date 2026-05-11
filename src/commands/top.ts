import mongoose from 'mongoose';
import { CommandContext } from './types';

export async function handle(ctx: CommandContext) {
  try {
    if (!ctx.connectDB || !ctx.Message) return true;
    if (mongoose.connection.readyState !== 1) await ctx.connectDB();
    const agg = await ctx.Message.aggregate([
      { $group: { _id: '$senderId', count: { $sum: 1 }, name: { $first: '$senderName' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    if (!agg || !agg.length) {
      await ctx.send('Chưa có dữ liệu thống kê.');
      return true;
    }
    const lines = agg.map((r: any, i: number) => `${i + 1}. ${r.name || r._id}: ${r.count} tin nhắn`);
    await ctx.send(`Top gửi tin nhắn:\n${lines.join('\n')}`);
    return true;
  } catch (e) {
    console.error('top error', e);
    await ctx.send('Lấy top thất bại.');
    return true;
  }
}
