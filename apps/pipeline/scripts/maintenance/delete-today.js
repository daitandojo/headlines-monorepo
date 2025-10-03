// apps/pipeline/scripts/maintenance/delete-today.js
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { logger } from '@headlines/utils-shared'
import { deleteAllSince } from '@headlines/data-access'
import { initializeScriptEnv } from '../seed/lib/script-init.js'

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('minutes', {
      alias: 'm',
      type: 'number',
      description: 'Specify the lookback window in minutes.',
    })
    .option('yes', { type: 'boolean', description: 'Skip confirmation prompt.' })
    .help().argv

  await initializeScriptEnv()

  try {
    let cutoff
    let timeDescription
    if (argv.minutes) {
      cutoff = new Date(Date.now() - argv.minutes * 60 * 1000)
      timeDescription = `in the last ${argv.minutes} minutes`
    } else {
      cutoff = new Date()
      cutoff.setUTCHours(0, 0, 0, 0)
      timeDescription = 'today'
    }

    if (!argv.yes) {
      logger.warn(
        `This will delete all articles, events, and opportunities created ${timeDescription}. Run with --yes to proceed.`
      )
      return
    }

    logger.info(`Deleting all documents created ${timeDescription}...`)
    const result = await deleteAllSince(cutoff)

    if (!result.success) throw new Error(result.error)

    logger.info('✅ Deletion complete. Summary:')
    Object.entries(result.summary).forEach(([modelName, deletedCount]) => {
      if (deletedCount > 0) {
        logger.info(`  - Deleted ${deletedCount} ${modelName}.`)
      }
    })
  } catch (error) {
    logger.error({ err: error }, 'Deletion script failed.')
  }
}

main()
