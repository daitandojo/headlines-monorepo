// scripts/database/maintenance/reset-source-analytics.js (version 1.0)
import 'dotenv/config'
import { connectDatabase, disconnectDatabase } from '../../../src/database.js'
import Source from '../../../models/Source.js'
import { logger } from '@headlines/utils/src/logger.js'

async function resetAnalytics() {
  await connectDatabase()
  logger.info('🚀 Resetting all source analytics data...')
  try {
    const result = await Source.updateMany(
      {},
      {
        $set: {
          'analytics.totalRuns': 0,
          'analytics.totalSuccesses': 0,
          'analytics.totalFailures': 0,
          'analytics.totalScraped': 0,
          'analytics.totalRelevant': 0,
          'analytics.lastRunHeadlineCount': 0,
          'analytics.lastRunRelevantCount': 0,
          'analytics.lastRunContentSuccess': false,
        },
      }
    )
    logger.info(
      `✅ Analytics reset complete. Modified ${result.modifiedCount} source documents.`
    )
  } catch (error) {
    logger.fatal({ err: error }, '❌ Failed to reset source analytics.')
  } finally {
    await disconnectDatabase()
  }
}

resetAnalytics()
