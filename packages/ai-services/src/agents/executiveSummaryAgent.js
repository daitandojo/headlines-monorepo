import { logger } from '@headlines/utils-server/node'
import { AIAgent } from '../lib/AIAgent.js'
import { executiveSummarySchema } from '../schemas/executiveSummarySchema.js'
import { settings } from '@headlines/config/node'
import { instructionExecutiveSummary } from '@headlines/prompts'

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_SYNTHESIS,
    systemPrompt: instructionExecutiveSummary,
    zodSchema: executiveSummarySchema,
  })

export async function generateExecutiveSummary(judgeVerdict, runStats) {
  const agent = getAgent()
  try {
    // Create a payload with the crucial context for the AI
    const payload = {
      freshHeadlinesFound: runStats.freshHeadlinesFound,
      judgeVerdict: judgeVerdict || { event_judgements: [], opportunity_judgements: [] },
    }

    const response = await agent.execute(JSON.stringify(payload))

    if (response.error || !response.summary) {
      logger.warn('AI failed to generate an executive summary.', response)
      return 'AI failed to generate a summary for this run.'
    }

    return response.summary
  } catch (error) {
    logger.error({ err: error }, 'Error in generateExecutiveSummary')
    return 'An unexpected error occurred while generating the executive summary.'
  }
}
