import express from 'express';
import bodyParser from 'body-parser';
import connectDB from './config/db';
import { verifyWebhook, handleWebhook } from './controllers/webhook.controller';

// initialize DB (do not await in top-level if using ts-node-dev; handle errors)
connectDB().catch((err) => console.error('DB connect failed', err));

const app = express();
app.use(bodyParser.json());

app.get('/', (_req, res) => res.send('DNE Trùm Động Bot is alive'));

// Facebook webhook endpoints
app.get('/webhook', verifyWebhook);
app.post('/webhook', handleWebhook);

export default app;
