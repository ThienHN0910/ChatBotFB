import { Request, Response } from 'express';
import Knowledge from '../models/knowledge.model';
import { generateAnswer } from '../services/gemini.service';
import { sendTextMessage } from '../services/facebook.service';
import config from '../config';

// GET /webhook - verification
export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
    return res.status(200).send(challenge as any);
  }
  return res.sendStatus(403);
};

// POST /webhook - message events
export const handleWebhook = async (req: Request, res: Response) => {
  const body = req.body;
  if (body.object !== 'page') return res.sendStatus(404);

  try {
    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const senderId = event.sender?.id;
        const messageText = event.message?.text;
        if (!senderId || !messageText) continue;

        const trimmed = String(messageText).trim();
        const lower = trimmed.toLowerCase();

        // Help
        if (lower === '/h' || lower === '/help') {
          await sendTextMessage(senderId, 'Trùm Động đây! Lệnh: /ask <câu hỏi> - hỏi AI; /mem - xem thành viên; /history - xem lịch sử; /h - trợ giúp');
          continue;
        }

        // /mem - list authorized users
        if (lower === '/mem' || lower.startsWith('/mem ')) {
          try {
            const AuthorizedUser = (await import('../models/authorized_user.model')).default;
            const users = await AuthorizedUser.find({}).lean();
            const txt = users.length ? users.map((u: any) => `${u.email} (${u.role||'user'})`).join('\n') : 'Chưa có thành viên nào trong danh sách.';
            await sendTextMessage(senderId, `Danh sách thành viên:\n${txt}`);
          } catch (e) {
            console.error('Mem list error', e);
            await sendTextMessage(senderId, 'Không lấy được danh sách thành viên.');
          }
          continue;
        }

        // /history - show history-like entries
        if (lower === '/history' || lower.startsWith('/history ')) {
          try {
            const qRegex = /lich|history|lịch/ig;
            const docs = await Knowledge.find({ $or: [{ topic: qRegex }, { content: qRegex }, { keywords: { $in: ['history','lich','lịch'] } }] }).limit(5).lean();
            if (!docs || docs.length === 0) {
              await sendTextMessage(senderId, 'Không tìm thấy thông tin lịch sử.');
            } else {
              const txt = docs.map((d: any) => `- ${d.topic}: ${String(d.content).slice(0,200)}...`).join('\n');
              await sendTextMessage(senderId, `Lịch sử / thông tin:\n${txt}`);
            }
          } catch (e) {
            console.error('History error', e);
            await sendTextMessage(senderId, 'Lấy lịch sử thất bại.');
          }
          continue;
        }

        // /ask or /hoi -> ask Gemini
        let userQuestion = trimmed;
        if (lower.startsWith('/ask ')) userQuestion = trimmed.slice(5).trim();
        else if (lower.startsWith('/hoi ')) userQuestion = trimmed.slice(4).trim();
        else if (lower === '/ask' || lower === '/hoi') {
          await sendTextMessage(senderId, 'Gửi câu hỏi theo cú pháp: /ask <câu hỏi>');
          continue;
        } else {
          // Not a supported command
          continue;
        }

        // RAG: search knowledge base using topic/content/keywords
        const tokens = userQuestion.toLowerCase().split(/\s+/).map(t=>t.replace(/[^\p{L}\p{N}_]+/gu,'')).filter(Boolean).slice(0,10);
        let contexts: string[] = [];
        try {
          if (tokens.length > 0) {
            const docs = await Knowledge.find({ keywords: { $in: tokens } }).limit(5).lean();
            if (docs && docs.length) contexts = docs.map((d:any) => `${d.topic}\n${d.content}`);
          }
          if (contexts.length === 0) {
            const q = userQuestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const docs2 = await Knowledge.find({ $or: [{ topic: new RegExp(q,'i') }, { content: new RegExp(q,'i') }] }).limit(3).lean();
            if (docs2 && docs2.length) contexts = docs2.map((d:any)=>`${d.topic}\n${d.content}`);
          }
        } catch (dbErr) {
          console.error('DB search error', dbErr);
          try { await sendTextMessage(senderId, 'Server Động đang bị lag, đợi anh em gank xong tí trả lời nhé!'); } catch(e){console.error(e)}
          continue;
        }

        const systemPrompt = "Bạn là Trùm Động, đại diện DNE. Gọi người dùng là Nghiện hữu/Anh em. Giọng văn hài hước, lầy lội, dùng thuật ngữ Esport (check var, gank, combat...). Kết thúc bằng icon 🎮 hoặc 🔥.";

        let reply = '';
        try {
          reply = await generateAnswer(systemPrompt, contexts, userQuestion || '');
        } catch (err) {
          console.error('AI error', err);
          reply = 'Trùm Động bị đuổi khỏi combat, thử lại sau nhé 🎮';
        }

        // send back to Facebook
        try {
          await sendTextMessage(senderId, reply);
        } catch (err) {
          console.error('Failed to send message to FB:', err);
        }
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('webhook handling error', err);
    return res.sendStatus(500);
  }
};

export default { verifyWebhook, handleWebhook };
