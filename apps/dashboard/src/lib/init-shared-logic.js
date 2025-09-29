// apps/admin/src/lib/init-shared-logic.js (Corrected Import Path)
import * as appConfig from '@/../app.config.js'
// DEFINITIVE FIX: Import from the correct server-only entry point.
import { settings, initializeSettings } from '@headlines/config'
import { logger } from '@shared/utils-shared'
import dbConnect from '@headlines/data-access/dbConnect.js'

let isInitialized = false

export async function initializeSharedLogic() {
  if (isInitialized) {
    return
  }

  await dbConnect()

  await initializeSettings()

  configureScraperLogic({ ...appConfig, logger, settings, utilityFunctions: {} })

  isInitialized = true
}
