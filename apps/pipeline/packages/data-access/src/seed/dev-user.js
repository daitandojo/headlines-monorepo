// packages/data-access/src/seed/dev-user.js (version 2.0.0 - Standalone Safe)
'use server'

import { Subscriber } from '@headlines/models'
import dbConnect from '../dbConnect.js'
import mongoose from 'mongoose'
// We cannot use a logger here as this might be called before initialization
// import { logger } from '@headlines/utils/server';

const DEV_USER_ID = '662f831abb28052123530a43'
const DEV_USER_EMAIL = 'dev@headlines.dev'

export async function seedDevUser() {
  console.log(`[Seed] Seeding development user: ${DEV_USER_EMAIL}...`)
  try {
    await dbConnect()

    const devUser = {
      _id: new mongoose.Types.ObjectId(DEV_USER_ID),
      email: DEV_USER_EMAIL,
      password: 'devpassword', // This will be hashed by the pre-save hook
      firstName: 'Dev',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      countries: [],
      subscriptionTier: 'enterprise',
      isLifetimeFree: true,
    }

    const result = await Subscriber.updateOne(
      { _id: devUser._id },
      { $set: devUser },
      { upsert: true }
    )

    if (result.upsertedCount > 0) {
      console.log(`[Seed] ✅ Successfully created development user.`)
    } else {
      console.log(`[Seed] ✅ Development user is already up-to-date.`)
    }
    return { success: true }
  } catch (error) {
    console.error('[Seed] ❌ Failed to seed development user:', error)
    // Close connection on error if it's open and this is a standalone script run
    if (mongoose.connection.readyState === 1 && import.meta.url.startsWith('file:')) {
        await mongoose.disconnect();
    }
    return { success: false, error: error.message }
  }
}

// Allow script to be run directly from the command line
if (import.meta.url.startsWith('file://') && process.argv[1] === import.meta.url.substring(7)) {
    seedDevUser().finally(() => {
        if (mongoose.connection.readyState === 1) {
            mongoose.disconnect();
        }
    });
}
