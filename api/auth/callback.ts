import axios from 'axios';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import connectDB from '../../src/config/db';
import AuthorizedUser from '../../src/models/authorized_user.model';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.OAUTH_REDIRECT || 'https://chat-bot-fb-lime.vercel.app/api/auth/callback';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-prod';

export default async function handler(req: any, res: any) {
  try {
    const { code, state } = req.query || {};
    const cookies = cookie.parse(req.headers.cookie || '');
    const savedState = cookies.oauth_state;

    if (!code || !state || state !== savedState) {
      console.warn('Invalid OAuth state', { code, state, savedState });
      return res.status(400).send('Invalid OAuth state');
    }

    // Exchange code for tokens
    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code: String(code),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token } = tokenRes.data || {};
    if (!access_token) return res.status(500).send('No access token from Google');

    // Get user info
    const userRes = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const user = userRes.data || {};
    const email = user.email;

    await connectDB();
    const found = await AuthorizedUser.findOne({ email }).lean();
    if (!found) {
      console.warn('Unauthorized login attempt', email);
      return res.status(403).send('Unauthorized');
    }

    // Create session JWT
    const token = jwt.sign({ email, role: found.role || 'user' }, SESSION_SECRET, { algorithm: 'HS256', expiresIn: '7d' });

    res.setHeader('Set-Cookie', cookie.serialize('token', token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 3600 }));
    // Redirect to dashboard
    res.writeHead(302, { Location: '/api/dashboard' });
    res.end();
  } catch (err: any) {
    console.error('OAuth callback error:', err?.response?.data || err?.message || err);
    res.status(500).send('OAuth callback failed');
  }
}
