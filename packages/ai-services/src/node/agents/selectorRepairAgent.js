// packages/ai-services/src/node/agents/selectorRepairAgent.js
import { truncateString } from '@headlines/utils-shared'
import { logger } from '@headlines/utils-shared'
import { AIAgent } from '../../lib/AIAgent.js'
import { selectorRepairSchema } from '@headlines/models/schemas'
import { settings, LLM_CONTEXT_MAX_CHARS } from '@headlines/config/node'
import { instructionSelectorRepair } from '@headlines/prompts'

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_UTILITY,
    systemPrompt: [
      instructionSelectorRepair.whoYouAre,
      instructionSelectorRepair.whatYouDo,
      ...instructionSelectorRepair.guidelines,
      instructionSelectorRepair.outputFormatDescription,
      instructionSelectorRepair.reiteration,
    ].join('\n\n'),
    zodSchema: selectorRepairSchema,
  })

export async function suggestNewSelector(
  url,
  failedSelector,
  htmlContent,
  heuristicSuggestions = []
) {
  const selectorRepairAgent = getAgent()
  try {
    const payload = {
      url,
      failed_selector: failedSelector,
      heuristic_suggestions: heuristicSuggestions.map((s) => ({
        selector: s.selector,
        samples: s.samples.slice(0, 3),
      })),
      html_content: truncateString(htmlContent, LLM_CONTEXT_MAX_CHARS),
    }

    const response = await selectorRepairAgent.execute(JSON.stringify(payload))

    if (response.error || !response.suggested_selectors) {
      logger.error('Selector repair agent failed to produce a valid suggestion.', {
        response,
      })
      return null
    }

    return response
  } catch (error) {
    logger.error({ err: error }, 'Error in suggestNewSelector')
    return null
  }
}
