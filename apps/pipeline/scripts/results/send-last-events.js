// apps/pipeline/scripts/results/send-last-events.js
/**
 * @command results:send-last-events
 * @group Results
 * @description Manually trigger the notification dispatch for the most recent unsent events. Flags: --limit <number>
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { findEvents } from '@headlines/data-access'
import { sendNotifications } from '../../src/modules/notifications/index.js'

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('limit', {
      alias: 'l',
      type: 'number',
      description: 'Number of recent, unsent events to dispatch.',
      default: 10,
    })
    .help().argv

  await initializeScriptEnv()
  logger.info('🚀 Starting Manual Event Dispatcher...')

  try {
    const eventsResult = await findEvents({
      filter: { emailed: false },
      limit: argv.limit,
    })
    if (!eventsResult.success) throw new Error(eventsResult.error)
    const eventsToSend = eventsResult.data

    if (eventsToSend.length === 0) {
      logger.info('✅ No un-emailed events found. All notifications are up to date.')
      return
    }
    logger.info(`Found ${eventsToSend.length} recent, un-emailed event(s) to dispatch.`)

    await sendNotifications(eventsToSend, [])
  } catch (error) {
    logger.fatal(
      { err: error },
      'A critical error occurred during the manual dispatch process.'
    )
  }
}

main()
