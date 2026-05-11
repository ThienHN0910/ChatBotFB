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

export async function getUserName(psid: string) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN || config.fbPageAccessToken;
  if (!token) return null;
  try {
    const url = `https://graph.facebook.com/${psid}?fields=name&access_token=${token}`;
    const r = await axios.get(url);
    return r.data?.name || null;
  } catch (e) {
    return null;
  }
}
