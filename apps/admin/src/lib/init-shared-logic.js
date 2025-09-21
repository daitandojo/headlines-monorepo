// apps/admin/src/lib/init-shared-logic.js (Corrected Import Path)
import { configure as configureScraperLogic } from '@headlines/scraper-logic/config.js'
import * as appConfig from '@/../app.config.js'
// DEFINITIVE FIX: Import from the correct server-only entry point.
import { settings, initializeSettings } from '@headlines/config/server'
import { logger } from '@headlines/utils'
import dbConnect from '@headlines/actions/dbConnect.js'

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
