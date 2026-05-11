import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || '';

if (!MONGO_URI) console.warn('MONGO_URI is not set in environment');

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __mongoose_cached__: Cached | undefined;
}

const cached: Cached = (global as any).__mongoose_cached__ || ((global as any).__mongoose_cached__ = { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    mongoose.set('strictQuery', false);
    // disable buffering so operations fail fast when not connected
    mongoose.set('bufferCommands', false);
    cached.promise = mongoose
      .connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        family: 4
      })
      .then((m) => m as typeof mongoose);
  }

  cached.conn = await cached.promise;
  console.log('MongoDB connected (singleton)');
  return cached.conn;
}

export default connectDB;
