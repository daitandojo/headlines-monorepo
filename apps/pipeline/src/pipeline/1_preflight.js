// apps/pipeline/src/pipeline/1_preflight.js (version 7.3.0)
import { logger } from '@headlines/utils-server'
import { configure as configureScraperLogic } from '@headlines/scraper-logic/config.js'
import * as appConfig from '@headlines/config/server.js'
import { refreshConfig, configStore } from '../config/dynamicConfig.js'
import { initializeSettings, settings } from '@headlines/config/server.js'
import dbConnect from '@headlines/actions/dbConnect.js'
import { deleteTodaysDocuments } from '../../scripts/maintenance/delete-today.js'
import * as aiServices from '@headlines/ai-services'
import { performDatabaseHousekeeping } from '../utils/housekeeping.js'
import { configurePush } from '@headlines/scraper-logic/push/client.js'
import { configurePusher } from '@headlines/utils-server'
import { testRedisConnection } from '../utils/redisClient.js'

export async function runPreFlightChecks(pipelinePayload) {
  await dbConnect()
  pipelinePayload.dbConnection = true

  if (pipelinePayload.deleteToday) {
    logger.warn('--- DELETE TODAY MODE ENABLED ---')
    await deleteTodaysDocuments(true)
  }

  // Load crucial settings before anything else
  await initializeSettings()
  await refreshConfig()

  // Now that env vars and settings are loaded, configure external services
  configurePush()
  configurePusher()

  // New Redis Pre-flight Check
  if (!(await testRedisConnection())) {
    logger.fatal('Redis pre-flight check failed. Aborting pipeline.')
    return { success: false }
  }

  const utilityFunctions = {
    findAlternativeSources: aiServices.findAlternativeSources,
    findNewsApiArticlesForEvent: aiServices.findNewsApiArticlesForEvent,
    performGoogleSearch: aiServices.performGoogleSearch,
    fetchWikipediaSummary: aiServices.fetchWikipediaSummary,
  }

  configureScraperLogic({ ...appConfig, configStore, utilityFunctions, logger, settings })

  if (!(await aiServices.performAiSanityCheck(settings))) {
    logger.fatal('AI service checks failed. Aborting pipeline.')
    return { success: false }
  }

  // Run housekeeping early
  await performDatabaseHousekeeping()

  return { success: true, payload: pipelinePayload }
}
