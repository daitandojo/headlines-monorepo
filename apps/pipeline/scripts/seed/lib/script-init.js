// apps/pipeline/scripts/lib/script-init.js
import { logger } from '../@headlines/utils'
import { configure as configureScraperLogic } from '@headlines/scraper-logic/config.js'
import * as appConfig from '../../../../../packages/config/src/server.js'
import { refreshConfig, configStore } from '../../../src/config/dynamicConfig.js'
import {
  initializeSettings,
  settings,
} from '../../../../../packages/config/src/server.js'
import dbConnect from '../../../../../packages/data-access/src/dbConnect.js'
import * as aiServices from '../../../../../packages/ai-services/src/index.js'

let isInitialized = false

/**
 * Connects to DB, loads static and dynamic config, and configures shared packages.
 * This is the standard initialization routine for any standalone pipeline script.
 */
export async function initializeScriptEnv() {
  if (isInitialized) return

  await dbConnect()
  await initializeSettings()
  await refreshConfig()

  const utilityFunctions = {
    findAlternativeSources: aiServices.findAlternativeSources,
    findNewsApiArticlesForEvent: aiServices.findNewsApiArticlesForEvent,
    performGoogleSearch: aiServices.performGoogleSearch,
    fetchWikipediaSummary: aiServices.fetchWikipediaSummary,
  }

  configureScraperLogic({ ...appConfig, configStore, utilityFunctions, logger, settings })

  isInitialized = true
  logger.info('✅ Script environment initialized successfully.')
}
