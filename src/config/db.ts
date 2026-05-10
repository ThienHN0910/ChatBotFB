import mongoose from 'mongoose';
import config from './index';

const MONGO_URI = process.env.MONGO_URI || config.mongoURI;

if (!MONGO_URI) console.warn('MONGO_URI is not set in environment');

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var _mongooseCache: Cached | undefined;
}

const cached: Cached = (global as any)._mongooseCache || ((global as any)._mongooseCache = { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    mongoose.set('strictQuery', false);
    cached.promise = mongoose.connect(MONGO_URI, {}).then((m) => m);
  }

  cached.conn = await cached.promise;
  console.log('MongoDB connected (singleton)');
  return cached.conn;
}

export default connectDB;
