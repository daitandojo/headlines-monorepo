// File: apps/copyboard/src/lib/init-shared-logic.js (version 2.3 - FINAL)
'use server'

import { initializeSettings } from '@headlines/config/next'
// dbConnect is not used here.

let isInitialized = false

export async function initializeSharedLogic() {
  if (isInitialized) {
    return
  }

  // This function's only job is loading settings into memory.
  // DB connection is handled by data-access functions directly.
  await initializeSettings()

  isInitialized = true
}
