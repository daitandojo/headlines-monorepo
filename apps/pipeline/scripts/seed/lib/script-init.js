// apps/pipeline/scripts/seed/lib/script-init.js
import { logger } from '@headlines/utils-shared'
import { configure as configureScraperLogic } from '@headlines/scraper-logic/config.js'
import * as appConfig from '@headlines/config'
import { refreshConfig, configStore } from '../../../src/config/dynamicConfig.js'
import { populateSettings, settings } from '@headlines/config' // CORRECTED IMPORT
import dbConnect from '@headlines/data-access/dbConnect/node'
import * as aiServices from '@headlines/ai-services'
import { Setting } from '@headlines/models'

let isInitialized = false

/**
 * Connects to DB, loads static and dynamic config, and configures shared packages.
 * This is the standard initialization routine for any standalone pipeline script.
 */
export async function initializeScriptEnv() {
  if (isInitialized) return

  await dbConnect()

  // Load dynamic settings from the database and populate the config
  const dbSettings = await Setting.find({}).lean()
  populateSettings(dbSettings)

  await refreshConfig()

  const utilityFunctions = {
    findAlternativeSources: aiServices.findAlternativeSources,
    findNewsApiArticlesForEvent: aiServices.findNewsApiArticlesForEvent,
    performGoogleSearch: aiServices.performGoogleSearch,
    fetchWikipediaSummary: aiServices.fetchWikipediaSummary,
  }

  // Inject logger and other configs into shared packages
  configureScraperLogic({ ...appConfig, configStore, utilityFunctions, logger, settings })

  isInitialized = true
  logger.info('✅ Script environment initialized successfully.')
}
