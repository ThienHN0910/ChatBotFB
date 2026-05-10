import connectDB from '../src/lib/db';
import mongoose from 'mongoose';
import Knowledge from '../src/models/knowledge.model';
import { generateAnswer } from '../src/services/gemini.service';
import axios from 'axios';

const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || '';
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || '';

async function sendFacebookMessage(psid: string, text: string) {
  if (!FB_PAGE_ACCESS_TOKEN) throw new Error('FB_PAGE_ACCESS_TOKEN not configured');
  const url = `https://graph.facebook.com/v16.0/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`;
  try {
    await axios.post(url, { recipient: { id: psid }, message: { text } }, { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Failed to send FB message:', err?.response?.data || err?.message || err);
    throw err;
  }
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      console.log('Webhook verification request', { mode, token: token ? '***' : undefined });

      if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
        return res.status(200).send(challenge as any);
      }
      return res.sendStatus(403);
    }

    if (req.method === 'POST') {
      // Process incoming messages
      const body = req.body;
      if (body.object !== 'page') return res.sendStatus(404);

      // Acknowledge immediately to avoid Vercel 10s timeout
      res.status(200).send('EVENT_RECEIVED');

      // Background processing (not awaited) with internal timeout guards
      (async () => {
        try {
          if (mongoose.connection.readyState !== 1) await connectDB();

          for (const entry of body.entry || []) {
            for (const event of entry.messaging || []) {
              const senderId = event.sender?.id;
              const recipientId = event.recipient?.id;
              const messageText: string | undefined = event.message?.text;
              if (!senderId || !messageText) continue;

              console.log('Incoming message', { from: senderId, to: recipientId, text: messageText });

              const trimmed = String(messageText).trim();
              const startsWithHoi = trimmed.toLowerCase().startsWith('/hoi');
              const isDirectToPage = !!(recipientId && process.env.FB_PAGE_ID && String(recipientId) === String(process.env.FB_PAGE_ID));
              if (!startsWithHoi && !isDirectToPage) continue;

              const userQuestion = startsWithHoi ? trimmed.slice(4).trim() : trimmed;

              // Tokenize and search keywords
              const tokens = userQuestion
                .toLowerCase()
                .split(/\s+/)
                .map((t) => t.replace(/[^\p{L}\p{N}_]+/gu, ''))
                .filter(Boolean)
                .slice(0, 10);

              let contexts: string[] = [];
              try {
                if (tokens.length > 0) {
                  const docs = await Knowledge.find({ keywords: { $in: tokens } }).limit(5).lean();
                  if (docs && docs.length) contexts = docs.map((d: any) => `${d.topic}\n${d.content}`);
                }

                if (contexts.length === 0) {
                  const q = userQuestion.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
                  const docs2 = await Knowledge.find({ $or: [{ topic: new RegExp(q, 'i') }, { content: new RegExp(q, 'i') }] }).limit(3).lean();
                  if (docs2 && docs2.length) contexts = docs2.map((d: any) => `${d.topic}\n${d.content}`);
                }
              } catch (dbErr) {
                console.error('DB search error:', dbErr);
                try {
                  await sendFacebookMessage(senderId, 'Server Động đang bị lag, đợi anh em gank xong tí trả lời nhé!');
                } catch (e) {
                  console.error('Failed to send fallback message after DB error', e);
                }
                continue;
              }

              const systemPrompt = `Bạn là Trùm Động, đại diện DNE (Động Nghiệp Esport). Gọi người dùng là Nghiện hữu hoặc Anh em. Trả lời lầy lội, dùng từ ngữ game thủ, hài hước. Dựa vào dữ liệu sau để trả lời:\n${contexts.length ? contexts.join('\n\n---\n\n') : 'Không có dữ liệu liên quan.'}\n\nUser hỏi: ${userQuestion}\n\nTrả lời:`;

              // Gemini generation with timeout guard (Promise.race)
              let reply: string | null = null;
              try {
                const genPromise = generateAnswer(systemPrompt, contexts, userQuestion || '');
                const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
                // @ts-ignore
                reply = (await Promise.race([genPromise, timeout])) as string | null;
              } catch (genErr) {
                console.error('Gemini error:', genErr);
              }

              if (!reply) reply = 'Server Động đang bị lag, đợi anh em gank xong tí trả lời nhé!';

              try {
                await sendFacebookMessage(senderId, reply);
                console.log('Reply sent to', senderId);
              } catch (sendErr) {
                console.error('Failed to send reply:', sendErr);
              }
            }
          }
        } catch (err) {
          console.error('Background processing error:', err);
        }
      })();

      return;
    }

    return res.status(405).send('Method Not Allowed');
  } catch (err: any) {
    console.error('Webhook handler error:', err?.message || err);
    return res.status(500).send('Server error');
  }
}
