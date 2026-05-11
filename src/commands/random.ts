import { CommandContext } from './types';

export async function handle(ctx: CommandContext) {
  try {
    const args = ctx.args || [];
    if (args.length >= 2) {
      const min = parseInt(args[0], 10);
      const max = parseInt(args[1], 10);
      if (Number.isNaN(min) || Number.isNaN(max)) return await ctx.send('Usage: /random <min> <max>');
      const a = Math.min(min, max);
      const b = Math.max(min, max);
      const r = Math.floor(Math.random() * (b - a + 1)) + a;
      return await ctx.send(`Random: ${r}`);
    }
    const val = Math.floor(Math.random() * 101); // 0-100
    await ctx.send(`Tỉ lệ ngẫu nhiên: ${val}%`);
  } catch (e) {
    await ctx.send('Lỗi khi sinh số ngẫu nhiên.');
  }
}
