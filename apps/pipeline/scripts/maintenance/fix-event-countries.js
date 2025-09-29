// apps/pipeline/scripts/maintenance/fix-event-countries.js
'use server'

import mongoose from 'mongoose'
import { SynthesizedEvent } from '@headlines/models'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-server'
import colors from 'ansi-colors'

async function main() {
  await initializeScriptEnv()
  logger.info('🚀 Starting script to correct event countries based on source articles...')

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const eventsToFix = await SynthesizedEvent.find({
      createdAt: { $gte: twentyFourHoursAgo },
      // Add any other filter if needed, e.g., to find events with non-Danish countries
    }).populate({
      path: 'source_articles',
      model: 'Article', // This assumes you have an 'Article' model linked
      select: 'country',
    })

    if (eventsToFix.length === 0) {
      logger.info('✅ No recent events found needing country correction.')
      return
    }

    logger.info(
      colors.yellow(
        `Found ${eventsToFix.length} events to check and potentially correct.`
      )
    )

    const bulkOps = []
    for (const event of eventsToFix) {
      if (event.source_articles && event.source_articles.length > 0) {
        const sourceCountry = event.source_articles[0].country
        if (sourceCountry && event.country !== sourceCountry) {
          logger.info(`Correction needed for event: "${event.synthesized_headline}"`)
          logger.info(
            `  Current Country: ${colors.red(event.country)} -> Correct Country: ${colors.green(sourceCountry)}`
          )
          bulkOps.push({
            updateOne: {
              filter: { _id: event._id },
              update: { $set: { country: sourceCountry } },
            },
          })
        }
      }
    }

    if (bulkOps.length > 0) {
      logger.info(`Applying ${bulkOps.length} country corrections to the database...`)
      const result = await SynthesizedEvent.bulkWrite(bulkOps)
      logger.info(
        colors.green(`✅ Successfully corrected ${result.modifiedCount} events.`)
      )
    } else {
      logger.info('✅ No corrections were necessary for the found events.')
    }
  } catch (error) {
    logger.error(
      { err: error },
      'A critical error occurred during the correction script.'
    )
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  }
}

main()
