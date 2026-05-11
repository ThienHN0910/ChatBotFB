import mongoose from 'mongoose';
import connectDB from '../lib/db';
import Knowledge from '../models/knowledge.model';
import Message from '../models/message.model';
import { generateAnswer } from '../services/gemini.service';
import { dispatch } from '../commands';
import { getUserName } from '../services/facebook.service';
import axios from 'axios';

const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || '';

let PAGE_ID: string | null = process.env.FB_PAGE_ID || null;
let hasTriedFetchPageId = false;

async function fetchPageId() {
  if (PAGE_ID || !FB_PAGE_ACCESS_TOKEN || hasTriedFetchPageId) return PAGE_ID;
  hasTriedFetchPageId = true;
  try {
    const resp = await axios.get('https://graph.facebook.com/v16.0/me', {
      params: { access_token: FB_PAGE_ACCESS_TOKEN }
    });
    PAGE_ID = resp.data?.id || null;
    console.log('Fetched Facebook Page ID:', PAGE_ID);
  } catch (err: any) {
    console.warn('Failed to fetch Page ID:', err?.response?.data || err?.message || err);
  }
  return PAGE_ID;
}

// Fire and forget at startup (optional but good for Vercel warm starts)
fetchPageId().catch(() => {});

export async function sendFacebookMessage(psid: string, text: string) {
  if (!FB_PAGE_ACCESS_TOKEN) throw new Error('FB_PAGE_ACCESS_TOKEN not configured');
  const url = `https://graph.facebook.com/v16.0/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`;
  try {
    await axios.post(url, { recipient: { id: psid }, message: { text } }, { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Failed to send FB message:', err?.response?.data || err?.message || err);
    throw err;
  }
}

export async function processWebhookEvent(senderId: string, recipientId: string, messageText: string, event: any) {
  try {
    const trimmed = String(messageText).trim();
    
    // Ensure PAGE_ID is loaded
    await fetchPageId();
    
    const isDirectToPage = !!(recipientId && PAGE_ID && String(recipientId) === String(PAGE_ID));
    const isCommand = trimmed.startsWith('/');
    
    // Some legacy commands check
    const isHoi = trimmed.toLowerCase().startsWith('/hoi ');
    if (!isCommand && !isDirectToPage && !isHoi) return;

    // Try to connect to DB, but don't crash the whole webhook if it fails
    let dbConnected = false;
    try {
      if (mongoose.connection.readyState !== 1) {
        await connectDB();
      }
      dbConnected = true;
    } catch (err) {
      console.error('Failed to connect to MongoDB, skipping DB operations:', err);
    }

    // Persist message for analytics/history
    if (dbConnected) {
      try {
        const name = await getUserName(senderId).catch(() => null);
        await Message.create({ senderId, senderName: name || undefined, text: messageText });
      } catch (e) {
        console.error('Failed to record message', e);
      }
    }

    // Dispatch command to modular handlers
    if (isCommand || isHoi) {
      try {
        // If it starts with /hoi, treat it as /ask
        let token = trimmed.split(/\s+/)[0] || '';
        let commandName = token.startsWith('/') ? token.slice(1) : token;
        let args = trimmed.split(/\s+/).slice(1);
        
        if (isHoi) {
            commandName = 'ask';
            args = trimmed.slice(4).trim().split(/\s+/); // /hoi <question>
        }

        const handled = await dispatch(commandName, args, {
          senderId,
          messageText,
          args,
          event,
          send: async (t: string) => await sendFacebookMessage(senderId, t),
          connectDB: async () => mongoose.connection.readyState === 1 ? Promise.resolve() : connectDB(),
          Knowledge,
          Message,
          generateAnswer,
          getUserName: async (id: string) => await getUserName(id)
        });
        
        if (handled) return; // Command dispatched and handled, stop further processing
      } catch (e) {
        console.error('dispatch error', e);
      }
    }

    // Determine question text if direct message to page and not a command handled above
    let userQuestion = trimmed;
    if (isHoi) userQuestion = trimmed.slice(4).trim();
    else if (!isCommand && isDirectToPage) userQuestion = trimmed;
    else return;

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
      return;
    }

    const systemPrompt = `Bạn là Trùm Động, đại diện DNE (Động Nghiệp Esport). Gọi người dùng là Nghiện hữu hoặc Anh em. Trả lời lầy lội, dùng từ ngữ game thủ, hài hước. Dựa vào dữ liệu sau để trả lời:\n${contexts.length ? contexts.join('\n\n---\n\n') : 'Không có dữ liệu liên quan.'}\n\nUser hỏi: ${userQuestion}\n\nTrả lời:`;

    // Gemini generation with timeout guard
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
  } catch (err) {
    console.error('Error processing webhook event', err);
  }
}
