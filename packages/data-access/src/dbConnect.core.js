import mongoose from 'mongoose'

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
    console.error('[dbConnect] MongoDB connection failed:', e)
    throw e
  }
}
