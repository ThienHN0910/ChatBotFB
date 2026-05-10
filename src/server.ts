import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
import connectDB from './lib/db';

// allow importing the optional Google library without TS errors
declare module '@google/generative-ai';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const MONGO_URI = process.env.MONGO_URI || '';
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || '';
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

if (!MONGO_URI) console.warn('Warning: MONGO_URI is not set');
if (!FB_PAGE_ACCESS_TOKEN) console.warn('Warning: FB_PAGE_ACCESS_TOKEN is not set');

// Connect to MongoDB at startup (explicit, not at module import)
(async () => {
  try {
    if (mongoose.connection.readyState !== 1) await connectDB();
  } catch (err) {
    console.error('MongoDB connection error at startup', err);
  }
})();

// Knowledge schema as requested: { topic: String, content: String, keywords: [String] }
const KnowledgeSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    content: { type: String, required: true },
    keywords: { type: [String], default: [] }
  },
  { timestamps: true }
);

const Knowledge = mongoose.models.Knowledge || mongoose.model('Knowledge', KnowledgeSchema, 'knowledge_base');

// Try to load @google/generative-ai library (optional). If unavailable, we'll fallback to REST.
let genAiLib: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  genAiLib = require('@google/generative-ai');
  console.log('Loaded @google/generative-ai library');
} catch (e) {
  console.warn('@google/generative-ai not available, will use REST fallback');
}

// Helper: fetch Page ID (to detect direct-to-page messages)
let PAGE_ID: string | null = null;
async function fetchPageId() {
  if (!FB_PAGE_ACCESS_TOKEN) return;
  try {
    const resp = await axios.get('https://graph.facebook.com/v16.0/me', {
      params: { access_token: FB_PAGE_ACCESS_TOKEN }
    });
    PAGE_ID = resp.data?.id || null;
    console.log('Facebook Page ID:', PAGE_ID);
  } catch (err: any) {
    console.warn('Failed to fetch Page ID:', err?.response?.data || err?.message || err);
  }
}

fetchPageId().catch(() => {});

// Gemini / Generative call wrapper. Tries SDK first, falls back to REST.
async function generateWithGemini(systemPrompt: string): Promise<string> {
  const prompt = systemPrompt;

  // Try SDK usage when available
  if (genAiLib) {
    try {
      // Support a few possible client names / call shapes
      const Client = genAiLib.TextServiceClient || genAiLib.TextGenerationClient || genAiLib.GenerativeServiceClient || genAiLib.default;
      if (Client) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-new
        const client = new Client({ apiKey: GOOGLE_API_KEY });
        // try common method names
        if (typeof client.generate === 'function') {
          // @ts-ignore
          const res = await client.generate({ model: 'text-bison-001', prompt });
          // try a few possible response shapes
          const out = res?.candidates?.[0]?.content || res?.output?.[0]?.content || res?.choices?.[0]?.text || res?.text;
          if (out) return String(out).trim();
        }
        if (typeof client.generateText === 'function') {
          // @ts-ignore
          const res = await client.generateText({ model: 'text-bison-001', input: prompt });
          const out = res?.candidates?.[0]?.content || res?.outputText || res?.text;
          if (out) return String(out).trim();
        }
      }
    } catch (err: any) {
      console.warn('SDK Gemini call failed, falling back to REST:', err?.response?.data || err?.message || err);
    }
  }

  // REST fallback using Generative Language API
  if (!GOOGLE_API_KEY) throw new Error('Missing GOOGLE_API_KEY for Gemini REST call');
  const url = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate?key=${GOOGLE_API_KEY}`;
  try {
    const res = await axios.post(
      url,
      {
        prompt: { text: prompt },
        temperature: 0.2,
        maxOutputTokens: 512
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const data = res.data || {};
    const candidate = data?.candidates?.[0]?.content || data?.output?.[0]?.content || data?.choices?.[0]?.text || data?.text;
    return (candidate && String(candidate).trim()) || '';
  } catch (err: any) {
    console.error('Gemini REST call failed:', err?.response?.data || err?.message || err);
    throw err;
  }
}

// Send message to FB via Graph API
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

// Express app and webhook
const app = express();
app.use(bodyParser.json());

app.get('/', (_req: Request, res: Response) => res.send('DNE Trùm Động Bot is alive'));

// Webhook verification endpoint
app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
    return res.status(200).send(challenge as any);
  }
  return res.sendStatus(403);
});

// Webhook POST - message events
app.post('/webhook', async (req: Request, res: Response) => {
  const body = req.body;
  if (body.object !== 'page') return res.sendStatus(404);

  // Acknowledge quickly
  res.status(200).send('EVENT_RECEIVED');

  try {
    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const senderId = event.sender?.id;
        const recipientId = event.recipient?.id;
        const messageText: string | undefined = event.message?.text;
        if (!senderId || !messageText) continue;

        const trimmed = String(messageText).trim();

        // Only respond if starts with '/hoi ' OR was sent directly to the Page
        const startsWithHoi = trimmed.toLowerCase().startsWith('/hoi ');
        const isDirectToPage = !!(recipientId && PAGE_ID && String(recipientId) === String(PAGE_ID));
        if (!startsWithHoi && !isDirectToPage) continue;

        // Extract user question (if /hoi used, remove prefix)
        const userQuestion = startsWithHoi ? trimmed.slice(4).trim() : trimmed;

        // Build tokens from the question to search keywords
        const tokens = userQuestion
          .toLowerCase()
          .split(/\s+/)
          .map((t) => t.replace(/[^\p{L}\p{N}_]+/gu, ''))
          .filter(Boolean)
          .slice(0, 10);

        // RAG: search knowledge base
        let contexts: string[] = [];
        try {
          if (tokens.length > 0) {
            const docs = await Knowledge.find({ keywords: { $in: tokens } }).limit(5).lean();
            if (docs && docs.length) contexts = docs.map((d: any) => `${d.topic}\n${d.content}`);
          }

          // fallback to topic/content search if no docs found by keywords
          if (contexts.length === 0) {
            const q = userQuestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

        // Create System Prompt with context
        const systemPrompt = `Bạn là Trùm Động, đại diện DNE (Động Nghiệp Esport). Gọi người dùng là Nghiện hữu hoặc Anh em. Trả lời lầy lội, dùng từ ngữ game thủ, hài hước. Dựa vào dữ liệu sau để trả lời:\n${contexts.length ? contexts.join('\n\n---\n\n') : 'Không có dữ liệu liên quan.'}\n\nUser hỏi: ${userQuestion}\n\nTrả lời:`;

        // Call Gemini / Generative model
        let reply = '';
        try {
          reply = (await generateWithGemini(systemPrompt)) || '';
        } catch (genErr) {
          console.error('Gemini generation error:', genErr);
          reply = 'Server Động đang bị lag, đợi anh em gank xong tí trả lời nhé!';
        }

        // Ensure a fallback reply
        if (!reply) reply = 'Server Động đang bị lag, đợi anh em gank xong tí trả lời nhé!';

        // Send reply back to user via Facebook Graph API
        try {
          await sendFacebookMessage(senderId, reply);
        } catch (sendErr) {
          console.error('Error sending message to FB:', sendErr);
        }
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Trùm Động server running on port ${PORT}`);
});

process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
