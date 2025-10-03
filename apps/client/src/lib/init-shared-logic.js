// apps/client/src/lib/init-shared-logic.js (version 3.0.0)
'use server'

// ARCHITECTURAL REFACTORING: This file now handles settings initialization for the Next.js app.
import { populateSettings } from '@headlines/config/next'
import { Setting } from '@headlines/models/next'
import dbConnect from '@headlines/data-access/dbConnect/next'

let isInitialized = false

export async function initializeSharedLogic() {
  if (isInitialized) {
    return
  }

  // The Next.js application layer is now responsible for its own settings initialization.
  try {
    await dbConnect()
    const dbSettings = await Setting.find({}).lean()
    populateSettings(dbSettings)
  } catch (error) {
    // In Next.js, we log an error but don't halt the app; it will run on defaults.
    console.error(
      '[Next.js Init] CRITICAL: Failed to load settings from database. App will use default values.',
      error
    )
  }

  isInitialized = true
}
