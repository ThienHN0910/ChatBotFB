import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { processWebhookEvent } from './controllers/webhook.controller';
import { getPolicyHtml, getTermHtml } from './controllers/pages';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const MONGO_URI = process.env.MONGO_URI || '';
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || '';

if (!MONGO_URI) console.warn('Warning: MONGO_URI is not set');

const app = express();
app.use(express.json());

app.get('/', (_req: Request, res: Response) => res.send('DNE Trùm Động Bot is alive'));

// Map Vercel endpoints to Express for local dev
app.get('/policy', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(getPolicyHtml());
});
app.get('/term', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(getTermHtml());
});

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

        // Process via unified controller
        await processWebhookEvent(senderId, recipientId, messageText, event);
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
