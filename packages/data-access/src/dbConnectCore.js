// packages/data-access/src/dbConnectCore.js
import mongoose from 'mongoose'

/**
 * Caching the mongoose connection on the `globalThis` object.
 * This is necessary in a development environment with hot-reloading to prevent
 * new connections from being created on every file change. In production,
 * this will only run once.
 */
let cached = globalThis.mongoose

if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null }
}

/**
 * Core, environment-agnostic database connection logic.
 * @param {string} MONGO_URI - MongoDB connection string
 * @param {object} logger - Logger instance with info, error, and fatal methods
 * @returns {Promise<typeof mongoose>} Mongoose connection instance
 */
export default async function dbConnectCore(MONGO_URI, logger) {
  console.log('🔍 [dbConnectCore] Called at:', new Date().toISOString())
  console.log('🔍 [dbConnectCore] Mongoose readyState:', mongoose.connection.readyState)
  console.log('🔍 [dbConnectCore] Cached conn exists:', !!cached.conn)
  console.log('🔍 [dbConnectCore] Cached promise exists:', !!cached.promise)

  if (!MONGO_URI) {
    logger.fatal(
      '[dbConnectCore] FATAL: MONGO_URI is missing. Check your .env file and environment configuration.'
    )
    throw new Error('MONGO_URI must be provided to dbConnectCore.')
  }

  // If we already have a connection, check if it's still valid
  if (cached.conn) {
    const readyState = mongoose.connection.readyState
    console.log('✅ [dbConnectCore] Using cached connection, readyState:', readyState)
    // Verify the connection is still alive
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (readyState === 1) {
      return cached.conn
    } else {
      // Connection is stale, clear it
      logger.warn(
        '[dbConnectCore] Cached connection is stale (readyState: ' +
          readyState +
          '), reconnecting...'
      )
      cached.conn = null
      cached.promise = null
    }
  }

  // If a connection promise is not already in flight, create one.
  if (!cached.promise) {
    // Log a redacted URI to help debug connection string issues without exposing secrets.
    const redactedURI = MONGO_URI.replace(/:([^:]+)@/, ':****@')
    logger.info(`[dbConnectCore] Creating new database connection to: ${redactedURI}`)

    // Increased timeouts significantly to handle slow initial connections in serverless environments.
    const opts = {
      serverSelectionTimeoutMS: 30000, // 30 seconds to find a server
      socketTimeoutMS: 45000, // 45 seconds for a socket to timeout
      bufferCommands: false, // Disable buffering - fail fast instead of buffering queries
      maxPoolSize: 10, // Limit connection pool size
      minPoolSize: 1, // Keep at least one connection alive
    }

    console.log('🔧 [dbConnectCore] Connection options:', JSON.stringify(opts, null, 2))

    cached.promise = mongoose
      .connect(MONGO_URI, opts)
      .then((mongooseInstance) => {
        console.log('✅ [dbConnectCore] Connection promise resolved!')
        console.log(
          '✅ [dbConnectCore] ReadyState after connect:',
          mongoose.connection.readyState
        )
        logger.info('[dbConnectCore] ✅ New database connection established.')

        // Set up connection event listeners for better debugging
        mongoose.connection.on('disconnected', () => {
          logger.warn('[dbConnectCore] ⚠️ Database connection lost.')
          cached.conn = null
          cached.promise = null
        })

        mongoose.connection.on('error', (err) => {
          logger.error({ err }, '[dbConnectCore] Database connection error.')
        })

        return mongooseInstance
      })
      .catch((err) => {
        console.error('❌ [dbConnectCore] Connection promise rejected:', err.message)
        // Clear the promise so it can be retried
        cached.promise = null
        throw err
      })

    console.log('⏳ [dbConnectCore] Connection promise created, now awaiting...')
  } else {
    console.log(
      '⏳ [dbConnectCore] Connection promise already exists, awaiting existing promise...'
    )
  }

  // Await the connection promise and cache the connection object.
  try {
    console.log('⏳ [dbConnectCore] About to await connection promise...')
    const startTime = Date.now()
    cached.conn = await cached.promise
    const elapsed = Date.now() - startTime
    console.log(
      `✅ [dbConnectCore] Connection promise awaited successfully in ${elapsed}ms`
    )
    console.log('✅ [dbConnectCore] Final readyState:', mongoose.connection.readyState)
  } catch (e) {
    console.error('❌ [dbConnectCore] Failed to await connection promise:', e.message)
    // If the connection fails, clear the promise to allow for a retry on the next call.
    cached.promise = null

    const errorMessage =
      'MongoDB connection failed. This is often due to an incorrect MONGO_URI, IP whitelist issues, or a firewall blocking the connection.'

    if (logger) {
      logger.error({ err: e }, `[dbConnectCore] ${errorMessage}`)
    } else {
      console.error(`[dbConnectCore] ${errorMessage}`, e)
    }

    // Create error with cause property for compatibility across Node.js versions
    const error = new Error(errorMessage)
    error.cause = e
    throw error
  }

  console.log('🎯 [dbConnectCore] Returning connection')
  return cached.conn
}
