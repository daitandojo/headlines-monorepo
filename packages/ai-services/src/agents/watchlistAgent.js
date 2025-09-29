import { logger } from '@headlines/utils-server/node'
import { AIAgent } from '../lib/AIAgent.js'
import { watchlistSuggestionSchema } from '../schemas/watchlistSuggestionSchema.js'
import { settings } from '@headlines/config/node'
import { instructionWatchlistSuggestion } from '@headlines/prompts'

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_SYNTHESIS,
    systemPrompt: [
      instructionWatchlistSuggestion.whoYouAre,
      instructionWatchlistSuggestion.whatYouDo,
      ...instructionWatchlistSuggestion.guidelines,
      instructionWatchlistSuggestion.outputFormatDescription,
      instructionWatchlistSuggestion.reiteration,
    ].join('\n\n'),
    zodSchema: watchlistSuggestionSchema,
  })

/**
 * Analyzes events to generate new watchlist suggestions.
 * @param {Array<object>} events - High-quality synthesized events.
 * @param {Set<string>} existingWatchlistNames - A set of lowercase names already on the watchlist.
 * @returns {Promise<Array<object>>} An array of new WatchlistSuggestion documents.
 */
export async function generateWatchlistSuggestions(events, existingWatchlistNames) {
  const watchlistSuggestionAgent = getAgent()
  try {
    const payload = { events }
    const response = await watchlistSuggestionAgent.execute(JSON.stringify(payload))

    if (response.error || !Array.isArray(response.suggestions)) {
      logger.warn('AI failed to generate watchlist suggestions.', response)
      return []
    }

    // Post-filter to ensure we don't suggest entities that already exist
    const newSuggestions = response.suggestions.filter(
      (s) => !existingWatchlistNames.has(s.name.toLowerCase())
    )

    return newSuggestions
  } catch (error) {
    logger.error({ err: error }, 'Error in generateWatchlistSuggestions')
    return []
  }
}
