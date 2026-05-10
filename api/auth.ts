import axios from 'axios';
import cookie from 'cookie';
import { randomBytes } from 'crypto';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const REDIRECT_URI = process.env.OAUTH_REDIRECT || 'https://chat-bot-fb-lime.vercel.app/api/auth/callback';

export default async function handler(req: any, res: any) {
  try {
    // Start Google OAuth2 flow
    const state = randomBytes(12).toString('hex');
    const scope = ['openid', 'email', 'profile'].join(' ');

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope,
      access_type: 'offline',
      prompt: 'consent',
      state
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // Set state cookie (httpOnly)
    res.setHeader('Set-Cookie', cookie.serialize('oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' }));
    res.writeHead(302, { Location: authUrl });
    res.end();
  } catch (err: any) {
    console.error('Auth start error:', err?.message || err);
    res.status(500).send('Auth start failed');
  }
}
