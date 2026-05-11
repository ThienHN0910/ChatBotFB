import cookie from 'cookie';

export default async function handler(_req: any, res: any) {
  // Clear the token cookie
  res.setHeader('Set-Cookie', cookie.serialize('token', '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 }));
  // Redirect back to dashboard
  res.writeHead(302, { Location: '/dashboard' });
  res.end();
}
