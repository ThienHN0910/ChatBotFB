import express from 'express';
import { verifyWebhook, handleWebhook } from './controllers/webhook.controller';

const app = express();
app.use(express.json());

app.get('/', (_req, res) => res.send('DNE Trùm Động Bot is alive'));

// Facebook webhook endpoints
app.get('/webhook', verifyWebhook);
app.post('/webhook', handleWebhook);

export default app;
