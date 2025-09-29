// File: apps/pipeline/scripts/maintenance/resend-todays-events.js
'use server'

import mongoose from 'mongoose'
import { SynthesizedEvent } from '@headlines/models'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-server'
import colors from 'ansi-colors'

async function main() {
  await initializeScriptEnv()
  logger.info('🚀 Starting script to reset "emailed" status for today\'s events...')

  try {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const filter = { createdAt: { $gte: today } }

    const result = await SynthesizedEvent.updateMany(filter, {
      $set: { emailed: false },
    })

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
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  }
}

main()
