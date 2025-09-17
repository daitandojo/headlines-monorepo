// packages/data-access/src/dbConnect.js (version 3.0.0 - Connection Only)
import mongoose from 'mongoose';
import { env } from '../../config/src/server.js';

const MONGO_URI = env.MONGO_URI;

let cached = globalThis.mongoose;
if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is not defined. Please check your .env file.');
    }
    cached.promise = mongoose.connect(MONGO_URI, { bufferCommands: false }).then((mongooseInstance) => {
      console.log("[dbConnect] MongoDB connection successful.");
      return mongooseInstance;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("[dbConnect] MongoDB connection failed:", e);
    throw e;
  }
  return cached.conn;
}

export default dbConnect;
