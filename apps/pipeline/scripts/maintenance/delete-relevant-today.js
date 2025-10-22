// apps/pipeline/scripts/maintenance/delete-relevant-today.js (v2 - Hardened)
/**
 * @command maintenance:delete-relevant-today
 * @group Maintenance
 * @description Deletes all articles from today that were deemed relevant, forcing a full re-scrape on the next run.
 * @example pnpm run maintenance:delete-relevant-today -- --yes
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
    .option('yes', {
      type: 'boolean',
      description: 'Skip the confirmation prompt and proceed with deletion.',
    })
    .help().argv

  await initializeScriptEnv()
  logger.info('🚀 Searching for relevant articles from today to delete...')

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const filter = {
      createdAt: { $gte: twentyFourHoursAgo },
      $or: [
        { relevance_headline: { $gte: settings.HEADLINES_RELEVANCE_THRESHOLD } },
        { relevance_article: { $gte: settings.ARTICLES_RELEVANCE_THRESHOLD } },
      ],
    }

    // Select the fields needed for display, PLUS the _id to identify malformed docs.
    const articlesToDelete = await Article.find(filter)
      .select('_id headline relevance_headline relevance_article')
      .lean()

    if (articlesToDelete.length === 0) {
      logger.info('✅ No relevant articles from today were found to delete.')
      return
    }

    console.log(
      colors.yellow(
        `\nFound ${articlesToDelete.length} relevant articles from today that will be deleted:`
      )
    )

    // --- START OF THE FIX ---
    const tableData = articlesToDelete.map((a) => {
      // Safely handle potentially missing headlines
      if (!a.headline) {
        logger.warn(
          { articleId: a._id },
          'Found relevant article with a MISSING HEADLINE field.'
        )
        return {
          Headline: colors.red.bold('--- MISSING HEADLINE ---'),
          HL_Score: a.relevance_headline,
          Article_Score: a.relevance_article || 'N/A',
        }
      }
      return {
        Headline: a.headline.substring(0, 80) + (a.headline.length > 80 ? '...' : ''),
        HL_Score: a.relevance_headline,
        Article_Score: a.relevance_article || 'N/A',
      }
    })
    console.table(tableData)
    // --- END OF THE FIX ---

    if (!argv.yes) {
      logger.warn(
        colors.red.bold(
          '\n🔥 DANGER 🔥 This is a destructive operation. The articles listed above will be permanently deleted from the database.'
        )
      )
      logger.warn(`To proceed, run the command again with the --yes flag.`)
      return
    }

    logger.info(`Proceeding with deletion of ${articlesToDelete.length} articles...`)

    const result = await Article.deleteMany(filter)

    logger.info(
      colors.green(`✅ Successfully deleted ${result.deletedCount} relevant articles.`)
    )
    logger.info('The next pipeline run will re-scrape these headlines as fresh items.')
  } catch (error) {
    logger.error({ err: error }, 'A critical error occurred during the deletion script.')
  }
}

main()
