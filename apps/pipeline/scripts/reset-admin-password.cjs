// File: apps/pipeline/scripts/reset-admin-password.cjs (Final, Robust Version)

const dotenv = require('dotenv')
const path = require('path')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs') // <-- Explicitly require bcryptjs

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
const SALT_WORK_FACTOR = 10

const { Schema } = mongoose
const SubscriberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    role: { type: String, default: 'user' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'subscribers' }
)
const Subscriber =
  mongoose.models.Subscriber || mongoose.model('Subscriber', SubscriberSchema)

async function run() {
  if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      '❌ ERROR: MONGO_URI, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in your .env file.'
    )
    process.exit(1)
  }

  const cleanPassword = ADMIN_PASSWORD.replace(/^"|"$/g, '')

  let connection
  try {
    console.log('Connecting to MongoDB...')
    connection = await mongoose.connect(MONGO_URI)
    console.log('✅ MongoDB connection successful.')

    await Subscriber.deleteOne({ email: ADMIN_EMAIL })
    console.log(`✓ Previous user record for ${ADMIN_EMAIL} deleted.`)

    console.log(`Hashing password "${cleanPassword}" for ${ADMIN_EMAIL} with bcryptjs...`)

    // --- THE CRITICAL FIX: HASH THE PASSWORD HERE ---
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR)
    const hashedPassword = await bcrypt.hash(cleanPassword, salt)
    console.log(`✓ Password hashed successfully.`)

    // Now, save the user with the already-hashed password
    const newUser = await Subscriber.create({
      _id: new mongoose.Types.ObjectId('68d5cb75f9b4fbab29f1e89b'), // Keep a stable ID for consistency
      email: ADMIN_EMAIL,
      password: hashedPassword, // <-- SAVE THE HASHED PASSWORD
      firstName: 'Admin',
      role: 'admin',
      isActive: true,
    })
    console.log(`✅ SUCCESS: Admin user has been created/reset with ID: ${newUser._id}`)
  } catch (error) {
    console.error('❌ CRITICAL FAILURE:', error)
  } finally {
    if (connection) {
      await mongoose.disconnect()
      console.log('Database connection closed.')
    }
  }
}

run()
