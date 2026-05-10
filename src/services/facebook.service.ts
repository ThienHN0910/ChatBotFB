import axios from 'axios';
import config from '../config';

export async function sendTextMessage(psid: string, text: string) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN || config.fbPageAccessToken;
  if (!token) throw new Error('Missing FB_PAGE_ACCESS_TOKEN in environment');

  const url = `https://graph.facebook.com/v16.0/me/messages?access_token=${token}`;
  const body = {
    recipient: { id: psid },
    message: { text }
  };
  try {
    await axios.post(url, body);
  } catch (err: any) {
    console.error('sendTextMessage error:', err?.response?.data || err.message);
    throw err;
  }
}

export default { sendTextMessage };
