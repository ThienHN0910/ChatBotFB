import { CommandContext } from './types';

export async function handle(ctx: CommandContext) {
  const group = process.env.GROUP_LINK || 'https://www.facebook.com/messages/t/6141393309283013';
  const page = process.env.PAGE_LINK || 'https://www.facebook.com/profile.php?id=61589654425540';
  const discord = process.env.DISCORD_LINK || 'https://discord.gg/zKumexN9p';
  const site = process.env.WEBSITE_LINK || '';
  const txt = `Links:\nGroup: ${group}${site?`\nWebsite: ${site}`:''}\nPage: ${page}\n Discord: ${discord}`;
  await ctx.send(txt);
}
