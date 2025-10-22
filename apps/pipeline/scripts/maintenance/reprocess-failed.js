// apps/pipeline/scripts/maintenance/reprocess-failed.js
/**
 * @command maintenance:reprocess-failed
 * @group Maintenance
 * @description Finds and re-processes relevant articles from a recent failed run.
 * @example pnpm run maintenance:reprocess-failed -- --yes
 * @example pnpm run maintenance:reprocess-failed -- --yes --hours 48
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
      description: 'Skip the confirmation prompt.',
    })
    .option('hours', {
      alias: 'h',
      type: 'number',
      description: 'The lookback window in hours to find stuck articles.',
      default: 24,
    })
    .help().argv

  await initializeScriptEnv()
  logger.info(
    `🚀 Starting Reprocess script for failed articles from the last ${argv.hours} hours...`
  )

  try {
    const cutoffDate = new Date(Date.now() - argv.hours * 60 * 60 * 1000)

    const filter = {
      createdAt: { $gte: cutoffDate },
      relevance_headline: { $gte: settings.HEADLINES_RELEVANCE_THRESHOLD },
      synthesizedEventId: { $exists: false },
    }

    const articlesToReprocess = await Article.find(filter).lean()

    if (articlesToReprocess.length === 0) {
      logger.info(
        `✅ No stuck relevant articles found to reprocess within the last ${argv.hours} hours.`
      )
      return
    }

    console.log(
      colors.yellow(
        `\nFound ${articlesToReprocess.length} stuck articles that will be re-processed:`
      )
    )
    console.table(
      articlesToReprocess.map((a) => ({
        ID: a._id,
        Headline: a.headline.substring(0, 70) + '...',
        'Headline Score': a.relevance_headline,
      }))
    )

    if (!argv.yes) {
      logger.warn(
        colors.yellow.bold(
          `\n⚠️ This will delete any partial outputs (events, verdicts) from the time window and then re-run the pipeline on ONLY these articles. Run with --yes to proceed.`
        )
      )
      return
    }

    logger.info(`Proceeding with cleanup and re-processing...`)

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

    logger.info(colors.cyan('\n--- INITIATING REPROCESS PIPELINE RUN ---'))

    // --- START OF DEFINITIVE FIX ---
    // The `useTestPayload` flag is incorrect. The presence of the `articlesForPipeline`
    // array is the correct signal for an injected payload run.
    await runPipeline({
      articlesForPipeline: articlesToReprocess,
    })
    // --- END OF DEFINITIVE FIX ---
  } catch (error) {
    logger.error({ err: error }, 'A critical error occurred during the reprocess script.')
  }
}

main()
