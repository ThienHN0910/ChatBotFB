import connectDB from '../src/lib/db';
import mongoose from 'mongoose';
import AuthorizedUser from '../src/models/authorized_user.model';

/**
 * Protected seed endpoint to add an admin to `authorized_users`.
 * Protect with env var SEED_SECRET. Call with POST and JSON { "email": "..." }
 */
export default async function handler(req: any, res: any) {
  try {
    const SEED_SECRET = process.env.SEED_SECRET;
    if (!SEED_SECRET) return res.status(500).send('SEED_SECRET not configured');

    const provided = (req.headers['x-seed-secret'] as string) || req.query?.secret || req.body?.secret;
    if (!provided || provided !== SEED_SECRET) return res.status(401).send('Unauthorized');

    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const email = (req.body && req.body.email) || req.query.email;
    if (!email || typeof email !== 'string') return res.status(400).send('Missing email');

    if (mongoose.connection.readyState !== 1) await connectDB();

    const existing = await AuthorizedUser.findOne({ email }).lean();
    if (existing) return res.status(200).json({ ok: true, message: 'Already exists', email });

    const created = await AuthorizedUser.create({ email, role: 'admin' });
    return res.status(201).json({ ok: true, created: { email: created.email, role: created.role } });
  } catch (err: any) {
    console.error('seed-admin error:', err?.message || err);
    return res.status(500).send('Server error');
  }
}
