// packages/data-access/src/dbConnectCore.js
import mongoose from 'mongoose'

// A weak map to cache the connection promise per URI
const connectionCache = new WeakMap()

// This is the core, environment-agnostic connection logic.
export default async function dbConnectCore(MONGO_URI, logger) {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI must be provided to dbConnectCore.')
  }

  if (mongoose.connection.readyState >= 1) {
    return
  }

  // Use a cache to prevent multiple concurrent connection attempts
  let connPromise = connectionCache.get(mongoose)
  if (!connPromise) {
    connPromise = mongoose.connect(MONGO_URI, { bufferCommands: false })
    connectionCache.set(mongoose, connPromise)
  }

  try {
    await connPromise
  } catch (e) {
    if (logger) {
      logger.error({ err: e }, '[dbConnectCore] MongoDB connection failed.')
    } else {
      console.error('[dbConnectCore] MongoDB connection failed.', e)
    }
    throw e
  }
}
