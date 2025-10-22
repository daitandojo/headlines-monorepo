// apps/pipeline/scripts/maintenance/refresh-relevant-today.js
/**
 * @command maintenance:refresh-relevant
 * @group Maintenance
 * @description Finds relevant but unprocessed articles within a given time window, resets them, and re-runs the pipeline.
 * @example pnpm run maintenance:refresh-relevant -- --yes
 * @example pnpm run maintenance:refresh-relevant -- --yes --hours 48
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { Article, SynthesizedEvent, RunVerdict } from '@headlines/models'
import { settings } from '@headlines/config'
import colors from 'ansi-colors'
import { runPipeline } from '../../src/orchestrator.js'

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('yes', {
      type: 'boolean',
      description: 'Skip the confirmation prompt and proceed with the refresh.',
    })
    // --- START OF DEFINITIVE FIX ---
    .option('hours', {
      alias: 'h',
      type: 'number',
      description: 'The lookback window in hours to find stuck articles.',
      default: 24, // Default to the last 24 hours
    })
    // --- END OF DEFINITIVE FIX ---
    .help().argv

  await initializeScriptEnv()
  logger.info(
    `🚀 Starting Refresh & Re-run script for relevant articles from the last ${argv.hours} hours...`
  )

  try {
    const cutoffDate = new Date(Date.now() - argv.hours * 60 * 60 * 1000)

    const filter = {
      createdAt: { $gte: cutoffDate },
      relevance_headline: { $gte: settings.HEADLINES_RELEVANCE_THRESHOLD },
      // Find articles that are stuck and haven't been successfully part of an event
      synthesizedEventId: { $exists: false },
    }

    const articlesToReprocess = await Article.find(filter).lean()

    if (articlesToReprocess.length === 0) {
      logger.info(
        `✅ No relevant articles to refresh within the last ${argv.hours} hours.`
      )
      return
    }

    console.log(
      colors.yellow(
        `\nFound ${articlesToReprocess.length} relevant articles from the last ${argv.hours} hours that will be reset and re-processed:`
      )
    )
    console.table(
      articlesToReprocess.map((a) => ({
        Headline: a.headline.substring(0, 80) + '...',
        Status: a.status,
        'Headline Score': a.relevance_headline,
      }))
    )

    if (!argv.yes) {
      logger.warn(
        colors.yellow.bold(
          `\n⚠️ This will reset the articles above, delete any partial outputs (events, verdicts) from the same time window, and then re-run the pipeline on ONLY these articles. Run with --yes to proceed.`
        )
      )
      return
    }

    logger.info(`Proceeding with reset...`)

    const [eventDeletion, verdictDeletion] = await Promise.all([
      SynthesizedEvent.deleteMany({ createdAt: { $gte: cutoffDate } }),
      RunVerdict.deleteMany({ createdAt: { $gte: cutoffDate } }),
    ])
    logger.info(
      `Cleanup: Deleted ${eventDeletion.deletedCount} events and ${verdictDeletion.deletedCount} run verdicts from the time window.`
    )

    const articleIdsToReset = articlesToReprocess.map((a) => a._id)
    const update = {
      $set: { status: 'scraped' },
      $unset: {
        relevance_article: '',
        assessment_article: '',
        key_individuals: '',
        transactionType: '',
        tags: '',
        synthesizedEventId: '',
      },
    }
    const resetResult = await Article.updateMany(
      { _id: { $in: articleIdsToReset } },
      update
    )
    logger.info(`Successfully reset ${resetResult.modifiedCount} articles.`)

    logger.info(colors.cyan('\n--- INITIATING REFRESH PIPELINE RUN ---'))

    await runPipeline({
      useTestPayload: true,
      articlesForPipeline: articlesToReprocess,
      ...argv,
    })
  } catch (error) {
    logger.error({ err: error }, 'A critical error occurred during the refresh script.')
  }
}

main()
