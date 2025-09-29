// apps/pipeline/src/pipeline/1_preflight.js
import { logger } from '@headlines/utils-server'
import { configure as configureScraperLogic } from '@headlines/scraper-logic/config.js'
import { env, initializeSettings, settings } from '@headlines/config'
import { refreshConfig, configStore } from '../config/dynamicConfig.js'
import dbConnect from '@headlines/data-access/dbConnect.js'
import { deleteTodaysDocuments } from '../../scripts/maintenance/delete-today.js'
import * as aiServices from '@headlines/ai-services'
import { performDatabaseHousekeeping } from '../utils/housekeeping.js'
import { configurePush } from '@headlines/scraper-logic/push/client.js'
import { configurePusher } from '@headlines/utils-server'
import { testRedisConnection } from '@headlines/utils-server'

export async function runPreFlightChecks(pipelinePayload) {
  logger.info('--- STAGE 1: PRE-FLIGHT CHECKS ---')
  await dbConnect()
  pipelinePayload.dbConnection = true

  if (pipelinePayload.deleteToday) {
    logger.warn('--- DELETE TODAY MODE ENABLED ---')
    await deleteTodaysDocuments(true)
  }

  await initializeSettings()
  await refreshConfig()

  configurePush()
  configurePusher()

  if (!(await testRedisConnection(env))) {
    logger.fatal('Redis pre-flight check failed. Aborting pipeline.')
    return { success: false }
  }

  const utilityFunctions = {
    findAlternativeSources: aiServices.findAlternativeSources,
    findNewsApiArticlesForEvent: aiServices.findNewsApiArticlesForEvent,
    performGoogleSearch: aiServices.performGoogleSearch,
    fetchWikipediaSummary: aiServices.fetchWikipediaSummary,
  }

  configureScraperLogic({ ...env, configStore, utilityFunctions, logger, settings })

  if (!(await aiServices.performAiSanityCheck(settings))) {
    logger.fatal('AI service checks failed. Aborting pipeline.')
    return { success: false }
  }

  await performDatabaseHousekeeping()

  return { success: true, payload: pipelinePayload }
}
