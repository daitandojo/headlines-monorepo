// packages/scraper-logic/src/ai/agents/watchlistAgent.js (version 2.3.1)
import { getConfig } from '../../config.js';
import { AIAgent } from '../AIAgent.js'
import { watchlistSuggestionSchema } from '../schemas/watchlistSuggestionSchema.js'
import { env } from '../../../../config/src/index.js'
import { instructionWatchlistSuggestion } from '../../../../prompts/src/index.js'

const getAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_SYNTHESIS,
    systemPrompt: instructionWatchlistSuggestion,
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
      getConfig().logger.warn('AI failed to generate watchlist suggestions.', response)
      return []
    }

    // Post-filter to ensure we don't suggest entities that already exist
    const newSuggestions = response.suggestions.filter(
      (s) => !existingWatchlistNames.has(s.name.toLowerCase())
    )

    return newSuggestions
  } catch (error) {
    getConfig().logger.error({ err: error }, 'Error in generateWatchlistSuggestions')
    return []
  }
}
