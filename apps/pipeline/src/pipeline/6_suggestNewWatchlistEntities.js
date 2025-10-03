// apps/pipeline/src/pipeline/6_suggestNewWatchlistEntities.js (version 4.1)

import { logger } from '@headlines/utils-shared' // The universal, isomorphic logger
import { auditLogger } from '@headlines/utils-server' // The server-only, file-writing audit logger

import { watchlistSuggestionChain } from '@headlines/ai-services'
import {
  getActiveWatchlistEntityNames,
  bulkWriteWatchlistSuggestions,
} from '@headlines/data-access'
import { settings } from '@headlines/config'

export async function suggestNewWatchlistEntities(pipelinePayload) {
  logger.info('--- STAGE 6: WATCHLIST SUGGESTION ---')

  const { savedEvents } = pipelinePayload
  if (!savedEvents || savedEvents.length === 0) {
    logger.info('No new events saved. Skipping watchlist suggestion.')
    return
  }

  const highQualityEvents = savedEvents.filter(
    (e) => e.highest_relevance_score >= settings.SUGGESTION_GENERATION_THRESHOLD
  )
  if (highQualityEvents.length === 0) {
    logger.info(
      `No events met quality threshold (${settings.SUGGESTION_GENERATION_THRESHOLD}) for suggestions.`
    )
    return
  }

  logger.info(
    `Analyzing ${highQualityEvents.length} high-quality events for new watchlist candidates...`
  )

  const existingEntitiesResult = await getActiveWatchlistEntityNames()
  if (!existingEntitiesResult.success) {
    logger.error(
      { err: existingEntitiesResult.error },
      'Failed to fetch existing watchlist entities.'
    )
    return
  }
  const existingNames = new Set(
    existingEntitiesResult.data.map((e) => e.name.toLowerCase())
  )

  const result = await watchlistSuggestionChain({
    events_json_string: JSON.stringify(highQualityEvents),
  })

  if (result.error || !result.suggestions) {
    logger.warn('AI failed to generate watchlist suggestions.', result)
    return
  }

  // Post-filter to ensure we don't suggest entities that already exist
  const newSuggestions = result.suggestions.filter(
    (s) => !existingNames.has(s.name.toLowerCase())
  )

  if (newSuggestions.length > 0) {
    logger.info(`AI generated ${newSuggestions.length} new watchlist suggestions.`)
    const bulkOps = newSuggestions.map((suggestion) => ({
      updateOne: {
        filter: { name: suggestion.name },
        update: { $setOnInsert: suggestion },
        upsert: true,
      },
    }))

    const dbResult = await bulkWriteWatchlistSuggestions(bulkOps)
    if (dbResult.success) {
      logger.info(
        `Successfully saved ${newSuggestions.length} new suggestions to the database.`
      )
    } else {
      logger.error({ err: dbResult.error }, 'Failed to save new watchlist suggestions.')
    }
  } else {
    logger.info('AI analysis did not yield any new watchlist suggestions.')
  }
}
