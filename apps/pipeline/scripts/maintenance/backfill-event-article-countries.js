// apps/pipeline/scripts/maintenance/backfill-event-article-countries.js
'use server'

import mongoose from 'mongoose'
import { SynthesizedEvent, Article } from '@headlines/models'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-server'
import colors from 'ansi-colors'
import cliProgress from 'cli-progress'

async function main() {
  await initializeScriptEnv()
  logger.info('🚀 Starting backfill of `country` field for event source articles...')

  try {
    const eventsToFix = await SynthesizedEvent.find({
      'source_articles.country': { $exists: false },
    })
      .select('_id source_articles')
      .lean()

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

    const bulkOps = []
    for (const event of eventsToFix) {
      const links = event.source_articles.map((sa) => sa.link)
      const articles = await Article.find({ link: { $in: links } })
        .select('link country')
        .lean()
      const articleCountryMap = new Map(articles.map((a) => [a.link, a.country]))

      const updatedSourceArticles = event.source_articles.map((sa) => ({
        ...sa,
        country: articleCountryMap.get(sa.link) || null,
      }))

      bulkOps.push({
        updateOne: {
          filter: { _id: event._id },
          update: { $set: { source_articles: updatedSourceArticles } },
        },
      })
      progressBar.increment()
    }
    progressBar.stop()

    if (bulkOps.length > 0) {
      logger.info(`Applying ${bulkOps.length} updates to the database...`)
      const result = await SynthesizedEvent.bulkWrite(bulkOps)
      logger.info(
        colors.green(
          `✅ Backfill complete. Successfully updated ${result.modifiedCount} events.`
        )
      )
    }
  } catch (error) {
    logger.error({ err: error }, 'A critical error occurred during the backfill script.')
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  }
}

main()
