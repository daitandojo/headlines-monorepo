// scripts/database/maintenance/reset-source-analytics.js
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { resetAllSourceAnalytics } from '@headlines/data-access'

async function resetAnalytics() {
  await initializeScriptEnv()
  logger.info('🚀 Resetting all source analytics data...')
  try {
    const result = await resetAllSourceAnalytics()
    if (!result.success) throw new Error(result.error)

    logger.info(
      `✅ Analytics reset complete. Modified ${result.modifiedCount} source documents.`
    )
  } catch (error) {
    logger.fatal({ err: error }, '❌ Failed to reset source analytics.')
  }
}

resetAnalytics()
