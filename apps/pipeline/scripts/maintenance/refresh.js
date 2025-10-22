// apps/pipeline/scripts/maintenance/refresh.js
/**
 * @command maintenance:refresh
 * @group Maintenance
 * @description Resets today's relevant articles and triggers a --refresh pipeline run.
 * @example pnpm run maintenance:refresh -- --yes
 * @example pnpm run maintenance:refresh -- --yes --hours 48
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { Article, SynthesizedEvent, RunVerdict } from '@headlines/models'
import { settings } from '@headlines/config'
import colors from 'ansi-colors'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('yes', {
      type: 'boolean',
      description: 'Skip the confirmation prompt.',
    })
    .option('hours', {
      alias: 'h',
      type: 'number',
      description: 'The lookback window in hours to find articles.',
      default: 24,
    })
    .help().argv

  await initializeScriptEnv()
  logger.info(
    `🚀 Starting Refresh script for relevant articles from the last ${argv.hours} hours...`
  )

  try {
    const cutoffDate = new Date(Date.now() - argv.hours * 60 * 60 * 1000)

    const filter = {
      createdAt: { $gte: cutoffDate },
      relevance_headline: { $gte: settings.HEADLINES_RELEVANCE_THRESHOLD },
      synthesizedEventId: { $exists: false },
    }

    const articlesToRefresh = await Article.find(filter).lean()

    if (articlesToRefresh.length === 0) {
      logger.info(
        `✅ No relevant articles found to refresh within the last ${argv.hours} hours.`
      )
      return
    }

    console.log(
      colors.yellow(`\nFound ${articlesToRefresh.length} relevant articles to refresh:`)
    )
    console.table(
      articlesToRefresh.map((a) => ({
        ID: a._id,
        Headline: a.headline.substring(0, 70) + '...',
      }))
    )

    if (!argv.yes) {
      logger.warn(
        colors.yellow.bold(
          `\n⚠️ This will delete any partial outputs (events, verdicts) from today and then trigger a new pipeline run with the --refresh flag. Run with --yes to proceed.`
        )
      )
      return
    }

    logger.info(`Proceeding with cleanup and refresh...`)

    const [eventDeletion, verdictDeletion] = await Promise.all([
      SynthesizedEvent.deleteMany({ createdAt: { $gte: cutoffDate } }),
      RunVerdict.deleteMany({ createdAt: { $gte: cutoffDate } }),
    ])
    logger.info(
      `Cleanup: Deleted ${eventDeletion.deletedCount} events and ${verdictDeletion.deletedCount} run verdicts.`
    )

    logger.info(colors.cyan('\n--- INITIATING REFRESH PIPELINE RUN ---'))

    // Construct the command to re-run the pipeline with --refresh
    // This assumes the script is run from the monorepo root via pnpm
    const command = `pnpm run pipeline -- --refresh`

    console.log(`Executing: ${command}`)

    // Execute the pipeline command and stream its output
    const child = exec(command, { cwd: process.cwd() })

    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)

    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Pipeline process exited with code ${code}`))
        }
      })
    })
  } catch (error) {
    logger.error({ err: error }, 'A critical error occurred during the refresh script.')
  }
}

main()
