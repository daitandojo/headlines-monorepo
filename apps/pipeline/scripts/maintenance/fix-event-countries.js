// apps/pipeline/scripts/maintenance/fix-event-countries.js
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { findEvents, updateEvent } from '@headlines/data-access'
import colors from 'ansi-colors'

async function main() {
  await initializeScriptEnv()
  logger.info('🚀 Starting script to correct event countries based on source articles...')

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const eventsResult = await findEvents({
      filter: { createdAt: { $gte: twentyFourHoursAgo } },
      populate: { path: 'source_articles', model: 'Article', select: 'country' },
    })

    if (!eventsResult.success) throw new Error(eventsResult.error)
    const eventsToFix = eventsResult.data

    if (eventsToFix.length === 0) {
      logger.info('✅ No recent events found needing country correction.')
      return
    }

    logger.info(
      colors.yellow(
        `Found ${eventsToFix.length} events to check and potentially correct.`
      )
    )

    let correctedCount = 0
    for (const event of eventsToFix) {
      if (event.source_articles && event.source_articles.length > 0) {
        const sourceCountry = event.source_articles[0].country
        if (sourceCountry && event.country !== sourceCountry) {
          logger.info(`Correction needed for event: "${event.synthesized_headline}"`)
          logger.info(
            `  Current Country: ${colors.red(event.country)} -> Correct Country: ${colors.green(sourceCountry)}`
          )
          const updateResult = await updateEvent(event._id, { country: sourceCountry })
          if (updateResult.success) correctedCount++
        }
      }
    }

    if (correctedCount > 0) {
      logger.info(colors.green(`✅ Successfully corrected ${correctedCount} events.`))
    } else {
      logger.info('✅ No corrections were necessary for the found events.')
    }
  } catch (error) {
    logger.error(
      { err: error },
      'A critical error occurred during the correction script.'
    )
  }
}

main()
