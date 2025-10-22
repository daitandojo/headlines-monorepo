// packages/data-access/src/dbConnectCore.js
import mongoose from 'mongoose'

let cached = globalThis.mongoose

if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null }
}

export default async function dbConnectCore(MONGO_URI, logger) {
  if (!logger || typeof logger.info !== 'function') {
    // Fallback if no logger is passed, though it always should be.
    logger = console
  }

  logger.trace(
    { readyState: mongoose.connection.readyState },
    '[dbConnectCore] Call received.'
  )

  if (!MONGO_URI) {
    logger.fatal('[dbConnectCore] FATAL: MONGO_URI is missing.')
    throw new Error('MONGO_URI must be provided to dbConnectCore.')
  }

  if (cached.conn) {
    const readyState = mongoose.connection.readyState
    logger.trace({ readyState }, '[dbConnectCore] Cached connection exists.')

    if (readyState === 1) {
      // 1 = connected
      return cached.conn
    }

    // Handle states that aren't 'connected' or 'connecting'
    if (readyState === 3 || readyState === 0 || readyState === 99) {
      // 3 = disconnecting, 0 = disconnected, 99 = uninitialized
      logger.warn(
        { readyState },
        '[dbConnectCore] Cached connection is stale or disconnected. Clearing cache to force reconnect.'
      )
      cached.conn = null
      cached.promise = null
    }
  }

  if (cached.promise) {
    logger.trace('[dbConnectCore] Awaiting existing connection promise.')
    try {
      cached.conn = await cached.promise
      return cached.conn
    } catch (e) {
      // The existing promise failed. Clear it to allow a new attempt.
      cached.promise = null
      logger.error(
        { err: e },
        '[dbConnectCore] Existing connection promise failed. Will retry.'
      )
      // Fall through to create a new connection promise.
    }
  }

  const redactedURI = MONGO_URI.replace(/:([^:]+)@/, ':****@')
  logger.info(`[dbConnectCore] Creating new database connection to: ${redactedURI}`)

  const opts = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 1,
  }

  cached.promise = mongoose.connect(MONGO_URI, opts).then((mongooseInstance) => {
    logger.info(
      { readyState: mongoose.connection.readyState },
      '[dbConnectCore] ✅ New database connection established.'
    )

    mongoose.connection.on('disconnected', () => {
      logger.warn('[dbConnectCore] ⚠️ Database connection lost.')
      cached.conn = null
      cached.promise = null
    })

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, '[dbConnectCore] Database connection error occurred.')
    })

    return mongooseInstance
  })

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null // Clear promise on failure to allow retry.
    const errorMessage =
      'MongoDB connection failed. Check MONGO_URI, IP whitelist, or firewall.'
    logger.error({ err: e }, `[dbConnectCore] ${errorMessage}`)

    const error = new Error(errorMessage)
    error.cause = e
    throw error
  }

  return cached.conn
}
