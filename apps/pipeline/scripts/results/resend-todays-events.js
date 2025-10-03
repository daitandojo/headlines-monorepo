// File: apps/pipeline/scripts/maintenance/resend-todays-events.js
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { resetEventsEmailedStatusSince } from '@headlines/data-access'
import colors from 'ansi-colors'

async function main() {
  await initializeScriptEnv()
  logger.info('🚀 Starting script to reset "emailed" status for today\'s events...')

  try {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const result = await resetEventsEmailedStatusSince(today)
    if (!result.success) throw new Error(result.error)

    if (result.matchedCount === 0) {
      logger.info('✅ No events found from today. Nothing to reset.')
    } else {
      logger.info(
        colors.green(
          `✅ Successfully reset ${result.modifiedCount} of ${result.matchedCount} events from today to "unsent". They are now ready to be dispatched.`
        )
      )
    }
  } catch (error) {
    logger.error(
      { err: error },
      'A critical error occurred during the event reset script.'
    )
  }
}

main()
