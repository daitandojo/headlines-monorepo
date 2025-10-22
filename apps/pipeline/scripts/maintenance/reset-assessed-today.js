// apps/pipeline/scripts/maintenance/reset-assessed-today.js (v2 - More Robust)
/**
 * @command maintenance:reset-assessed
 * @group Maintenance
 * @description Resets relevant articles that were assessed but not synthesized, preparing them for reprocessing. Flags: --all
 */
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { Article } from '@headlines/models'
import { settings } from '@headlines/config'
import colors from 'ansi-colors'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('all', {
      type: 'boolean',
      description:
        'Reset ALL stuck articles, regardless of creation date. (Default is today only)',
    })
    .help().argv

  await initializeScriptEnv()
  logger.info('🚀 Resetting relevant, assessed articles for reprocessing...')

  try {
    const filter = {
      status: 'assessed',
      synthesizedEventId: { $exists: false },
      relevance_headline: { $gte: settings.HEADLINES_RELEVANCE_THRESHOLD },
    }

    if (!argv.all) {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      filter.createdAt = { $gte: today }
      logger.info('Searching for articles created today. Use --all to search all time.')
    } else {
      logger.warn('Searching for ALL stuck articles regardless of creation date.')
    }

    const update = {
      $set: { status: 'scraped' },
      $unset: {
        relevance_article: '',
        assessment_article: '',
        key_individuals: '',
        pipeline_lifecycle: '',
        // Also unset new fields from enrich stage
        transactionType: '',
        tags: '',
      },
    }

    const result = await Article.updateMany(filter, update)

    if (result.matchedCount === 0) {
      logger.warn('⚠️ No relevant, assessed articles were found to reset.')
    } else {
      logger.info(
        colors.green(
          `✅ Successfully reset ${result.modifiedCount} of ${result.matchedCount} articles back to 'scraped' status.`
        )
      )
      logger.info('You can now safely re-run the pipeline to reprocess these articles.')
    }
  } catch (error) {
    logger.error({ err: error }, 'A critical error occurred during the reset script.')
  }
}

main()
