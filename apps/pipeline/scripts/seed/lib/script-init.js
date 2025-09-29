// apps/pipeline/scripts/lib/script-init.js
import { logger } from '@headlines/utils-server'
import { configure as configureScraperLogic } from '@headlines/scraper-logic/config.js'
import * as appConfig from '@headlines/config'
import { refreshConfig, configStore } from '../../../src/config/dynamicConfig.js'
import { initializeSettings, settings } from '@headlines/config'
import dbConnect from '@headlines/data-access/dbConnect.js'
import * as aiServices from '@headlines/ai-services'

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
