// packages/data-access/src/dbConnect.core.js
import mongoose from 'mongoose'
import { logger } from '@headlines/utils-shared'

export async function dbConnect(MONGO_URI) {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI must be provided to dbConnect.')
  }
  if (mongoose.connection.readyState >= 1) {
    return
  }
  try {
    await mongoose.connect(MONGO_URI, { bufferCommands: false })
  } catch (e) {
    logger.error({ err: e }, '[dbConnect] MongoDB connection failed.')
    throw e
  }
}
