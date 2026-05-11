import * as helpCmd from './help';
import * as timeCmd from './time';
import * as meCmd from './me';
import * as randomCmd from './random';
import * as fbCmd from './fb';
import * as askCmd from './ask';
import * as topCmd from './top';
import * as memCmd from './mem';
import * as historyCmd from './history';
import { CommandContext } from './types';

export async function dispatch(command: string, args: string[], ctxBase: CommandContext): Promise<boolean> {
  const cmd = command.toLowerCase();
  const ctx: CommandContext = { ...ctxBase, args };
  switch (cmd) {
    case 'h':
    case 'help':
      await helpCmd.handle(ctx);
      return true;
    case 'time':
    case 'gio':
      await timeCmd.handle(ctx);
      return true;
    case 'me':
      await meCmd.handle(ctx);
      return true;
    case 'random':
      await randomCmd.handle(ctx);
      return true;
    case 'fb':
    case 'link':
      await fbCmd.handle(ctx);
      return true;
    case 'ask':
      await askCmd.handle(ctx);
      return true;
    case 'top':
      await topCmd.handle(ctx);
      return true;
    case 'mem':
      await memCmd.handle(ctx);
      return true;
    case 'history':
      await historyCmd.handle(ctx);
      return true;
    default:
      // unknown command
      await ctx.send('Lệnh không được hỗ trợ. Gõ /h để xem danh sách lệnh.');
      return true; // We handled it by showing error, so return true
  }
}
