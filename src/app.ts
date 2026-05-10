import express from 'express';
import bodyParser from 'body-parser';
import { verifyWebhook, handleWebhook } from './controllers/webhook.controller';

const app = express();
app.use(bodyParser.json());

app.get('/', (_req, res) => res.send('DNE Trùm Động Bot is alive'));

// Facebook webhook endpoints
app.get('/webhook', verifyWebhook);
app.post('/webhook', handleWebhook);

export default app;
