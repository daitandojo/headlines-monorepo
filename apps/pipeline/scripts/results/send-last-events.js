// apps/pipeline/scripts/results/send-last-events.js (version 2.1.0)
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { initializeSettings } from '@headlines/config'
import { logger } from '@headlines/utils-server'
import { Subscriber, SynthesizedEvent } from '@headlines/models'
import { sendNotifications } from '../../src/modules/notifications/index.js'
import { refreshConfig } from '../../src/config/dynamicConfig.js'
import dbConnect from '@headlines/data-access/dbConnect.js'
import mongoose from 'mongoose'

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('limit', {
      alias: 'l',
      type: 'number',
      description: 'Number of recent, unsent events to dispatch.',
      default: 10,
    })
    .help().argv

  await dbConnect()
  logger.info('🚀 Starting Manual Event Dispatcher...')

  logger.info('Initializing dynamic configuration and settings...')
  await initializeSettings()
  await refreshConfig()
  logger.info('Configuration loaded.')

  try {
    const eventsToSend = await SynthesizedEvent.find({ emailed: false })
      .sort({ createdAt: -1 })
      .limit(argv.limit)
      .lean()

    if (eventsToSend.length === 0) {
      logger.info('✅ No un-emailed events found. All notifications are up to date.')
      return
    }
    logger.info(`Found ${eventsToSend.length} recent, un-emailed event(s) to dispatch.`)

    // The sendNotifications function is designed to handle dispatch to all relevant users
    // based on their country subscriptions. It's the perfect tool for the job.
    await sendNotifications(eventsToSend, [])
  } catch (error) {
    logger.fatal(
      { err: error },
      'A critical error occurred during the manual dispatch process.'
    )
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  }
}

main()
