// apps/pipeline/scripts/maintenance/backfill-event-article-countries.js
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger, sendErrorAlert } from '@headlines/utils-server'
import { findEvents, findArticles, updateEvents } from '@headlines/data-access'
import colors from 'ansi-colors'
import cliProgress from 'cli-progress'

async function main() {
  try {
    await initializeScriptEnv()
    logger.info('🚀 Starting backfill of `country` field for event source articles...')

    const eventsResult = await findEvents({
      filter: { 'source_articles.country': { $exists: false } },
      select: '_id source_articles',
    })

    if (!eventsResult.success) throw new Error(eventsResult.error)
    const eventsToFix = eventsResult.data

    if (eventsToFix.length === 0) {
      logger.info(
        '✅ No events found needing backfill. All source articles have country data.'
      )
      return
    }

    logger.info(
      colors.yellow(
        `Found ${eventsToFix.length} events to backfill. This may take a moment...`
      )
    )

    const progressBar = new cliProgress.SingleBar({
      format: `Backfilling | ${colors.cyan('{bar}')} | {percentage}% || {value}/{total} Events`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    })
    progressBar.start(eventsToFix.length, 0)

    for (const event of eventsToFix) {
      const links = event.source_articles.map((sa) => sa.link)
      const articlesResult = await findArticles({
        filter: { link: { $in: links } },
        select: 'link country',
      })

      if (articlesResult.success) {
        const articleCountryMap = new Map(
          articlesResult.data.map((a) => [a.link, a.country])
        )

        const updatedSourceArticles = event.source_articles.map((sa) => ({
          ...sa,
          country: articleCountryMap.get(sa.link) || null,
        }))

        await updateEvents(
          { _id: event._id },
          { $set: { source_articles: updatedSourceArticles } }
        )
      }
      progressBar.increment()
    }
    progressBar.stop()

    logger.info(colors.green(`✅ Backfill complete.`))
  } catch (error) {
    sendErrorAlert(error, { origin: 'BACKFILL_EVENT_ARTICLE_COUNTRIES_SCRIPT' })
    logger.fatal({ err: error }, 'A critical error occurred during the backfill script.')
  }
}

main()
