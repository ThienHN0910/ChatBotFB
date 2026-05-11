import { processWebhookEvent } from '../src/controllers/webhook.controller';

const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || '';

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
      const body = req.body;
      if (body.object !== 'page') return res.sendStatus(404);

      // Acknowledge immediately to avoid Vercel timeout
      res.status(200).send('EVENT_RECEIVED');

      // Background processing (not awaited)
      (async () => {
        try {
          for (const entry of body.entry || []) {
            for (const event of entry.messaging || []) {
              const senderId = event.sender?.id;
              const recipientId = event.recipient?.id;
              const messageText: string | undefined = event.message?.text;
              if (!senderId || !messageText) continue;

              console.log('Incoming message', { from: senderId, to: recipientId, text: messageText });
              await processWebhookEvent(senderId, recipientId, messageText, event);
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
