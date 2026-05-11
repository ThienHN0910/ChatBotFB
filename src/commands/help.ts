import { CommandContext } from './types';

export async function handle(ctx: CommandContext) {
  const helpLines = [
    '/ask <question> — Hỏi Gemini (RAG + AI)',
    '/time or /gio — Trả về giờ hệ thống (Asia/Ho_Chi_Minh).',
    '/ping — Kiểm tra độ trễ (Pong + ms).',
    '/fb or /link — Trả về links của Động.',
    '/me — Hiển thị tên Facebook và ID của bạn.',
    '/random — Tỉ lệ ngẫu nhiên (0-100%).',
    '/h or /help — Hiện trợ giúp.'
  ];
  await ctx.send(helpLines.join('\n'));
}
