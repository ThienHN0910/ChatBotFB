/*
  Run this script to insert or upsert an admin user into `authorized_users`.
  It reads MONGO_URI from .env in project root.
  Usage: node scripts/seed-admin.js
*/
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI not set in environment (.env)');
  process.exit(1);
}

const EMAIL = 'hnt.vn.vn@gmail.com';

(async () => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    const col = mongoose.connection.collection('authorized_users');
    const result = await col.updateOne(
      { email: EMAIL },
      { $set: { email: EMAIL, role: 'admin', createdAt: new Date() } },
      { upsert: true }
    );

    console.log('Seed result:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId
    });

    await mongoose.disconnect();
    console.log('Done. Inserted/updated admin:', EMAIL);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
})();
