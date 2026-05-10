import mongoose from 'mongoose';
import config from './index';

export async function connectDB() {
  const uri = config.mongoURI;
  if (!uri) throw new Error('MONGO_URI is not set in environment');
  try {
    await mongoose.connect(uri, { });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error', err);
    throw err;
  }
}

export default connectDB;
