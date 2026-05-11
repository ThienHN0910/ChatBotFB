import { Request, Response } from 'express';
import Knowledge from '../models/knowledge.model';
import Message from '../models/message.model';
import { generateAnswer } from '../services/gemini.service';
import { sendTextMessage, getUserName } from '../services/facebook.service';
import config from '../config';
import { dispatch } from '../commands';
import connectDB from '../lib/db';

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
        const token = trimmed.split(/\s+/)[0] || '';
        const commandName = token.startsWith('/') ? token.slice(1) : token;
        const args = trimmed.split(/\s+/).slice(1);

        // record message (best-effort)
        try {
          const fbName = await getUserName(senderId).catch(() => null);
          await Message.create({ senderId, senderName: fbName || undefined, text: messageText });
        } catch (e) {
          console.error('record msg error', e);
        }

        // Only dispatch commands (start with '/') - /ask will call Gemini; other non-command texts are ignored
        if (!commandName) continue;

        try {
          await dispatch(commandName, args, {
            senderId,
            messageText,
            args,
            event,
            send: async (t: string) => await sendTextMessage(senderId, t),
            connectDB,
            Knowledge,
            Message,
            generateAnswer,
            getUserName
          });
        } catch (e) {
          console.error('dispatch error', e);
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
