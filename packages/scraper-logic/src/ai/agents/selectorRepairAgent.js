// packages/scraper-logic/src/ai/agents/selectorRepairAgent.js (version 3.0.0)
import { truncateString } from '@headlines/utils';
import { getConfig } from '../../config.js';
import { AIAgent } from '../AIAgent.js'
import { selectorRepairSchema } from '../schemas/selectorRepairSchema.js'
import { env } from '@headlines/config'
import { instructionSelectorRepair } from '@headlines/prompts'

const getAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_UTILITY,
    systemPrompt: instructionSelectorRepair,
    zodSchema: selectorRepairSchema,
  })

export async function suggestNewSelector(url, failedSelector, htmlContent, heuristicSuggestions = []) {
  const selectorRepairAgent = getAgent()
  try {
    const payload = {
      url,
      failed_selector: failedSelector,
      // NEW: Add heuristic suggestions to the payload
      heuristic_suggestions: heuristicSuggestions.map(s => ({
          selector: s.selector,
          samples: s.samples.slice(0, 3)
      })),
      html_content: truncateString(htmlContent, 30000),
    }

    const response = await selectorRepairAgent.execute(JSON.stringify(payload))
    if (response.error || !response.suggested_selectors) {
      getConfig().logger.error('Selector repair agent failed to produce a valid suggestion.', {
        response,
      })
      return null
    }

    return response
  } catch (error) {
    getConfig().logger.error({ err: error }, 'Error in suggestNewSelector')
    return null
  }
}
