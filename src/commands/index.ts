import * as helpCmd from './help';
import * as timeCmd from './time';
import * as meCmd from './me';
import * as randomCmd from './random';
import * as fbCmd from './fb';
import * as askCmd from './ask';
import { CommandContext } from './types';

export async function dispatch(command: string, args: string[], ctxBase: CommandContext) {
  const cmd = command.toLowerCase();
  const ctx: CommandContext = { ...ctxBase, args };
  switch (cmd) {
    case 'h':
    case 'help':
      return await helpCmd.handle(ctx);
    case 'time':
    case 'gio':
      return await timeCmd.handle(ctx);
    case 'me':
      return await meCmd.handle(ctx);
    case 'random':
      return await randomCmd.handle(ctx);
    case 'fb':
    case 'link':
      return await fbCmd.handle(ctx);
    case 'ask':
      return await askCmd.handle(ctx);
    default:
      // unknown command
      await ctx.send('Lệnh không được hỗ trợ. Gõ /h để xem danh sách lệnh.');
      return;
  }
}
