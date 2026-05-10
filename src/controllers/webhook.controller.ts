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
        // Only respond when message starts with /hoi
        if (!trimmed.toLowerCase().startsWith('/hoi')) continue;

        const userQuestion = trimmed.slice(4).trim();

        // RAG: search knowledge base
        const docs = await Knowledge.find({ $text: { $search: userQuestion } }).limit(3).lean();
        const contexts = docs.map((d) => `${d.title}\n${d.content}`);

        const systemPrompt =
          "Bạn là Trùm Động, đại diện DNE. Gọi người dùng là Nghiện hữu/Anh em. Giọng văn hài hước, lầy lội, dùng thuật ngữ Esport (check var, gank, combat...). Kết thúc bằng icon 🎮 hoặc 🔥.";

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
