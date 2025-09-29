import mongoose from 'mongoose'
import { env } from '@headlines/config/next' // Use the Next.js entry point for env vars

const MONGO_URI = env.MONGO_URI

if (!MONGO_URI) {
  throw new Error('Please define the MONGO_URI environment variable inside .env.local')
}

/**
 * An idempotent function to connect to MongoDB.
 * It leverages Mongoose's built-in connection state management to prevent
 * creating multiple connections in serverless environments.
 * If a connection is already established, it does nothing. If one is pending,
 * Mongoose will reuse that promise internally.
 */
async function dbConnect() {
  // readyState codes: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  // If we are already connected or connecting, we can return immediately.
  if (mongoose.connection.readyState >= 1) {
    return
  }

  // If no connection is active, initiate one. Mongoose's `connect` method
  // will not create duplicate connections if called multiple times concurrently.
  // It returns a promise that resolves on successful connection.
  try {
    console.log('[dbConnect] No active connection. Attempting to connect...')
    await mongoose.connect(MONGO_URI, {
      bufferCommands: false, // Recommended for serverless environments
    })
    console.log('[dbConnect] MongoDB connection successful.')
  } catch (e) {
    console.error('[dbConnect] MongoDB connection failed:', e)
    throw e
  }
}

export default dbConnect
