// packages/ai-services/src/node/agents/watchlistAgent.js
import { logger } from '@headlines/utils-shared'
import { AIAgent } from '../../lib/AIAgent.js'
import { watchlistSuggestionSchema } from '@headlines/models/schemas'
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
  const watchlistSuggestionAgent = getAgent() // <-- FIX APPLIED HERE
  try {
    const payload = { events }
    const response = await watchlistSuggestionAgent.execute(JSON.stringify(payload))

    if (response.error || !Array.isArray(response.suggestions)) {
      logger.warn('AI failed to generate watchlist suggestions.', response)
      return []
    }

    const newSuggestions = response.suggestions.filter(
      (s) => !existingWatchlistNames.has(s.name.toLowerCase())
    )

    return newSuggestions
  } catch (error) {
    logger.error({ err: error }, 'Error in generateWatchlistSuggestions')
    return []
  }
}
