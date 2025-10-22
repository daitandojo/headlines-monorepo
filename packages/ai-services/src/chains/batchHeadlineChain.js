// packages/ai-services/src/chains/batchHeadlineChain.js
import { AIAgent } from '../lib/AIAgent.js'
import { batchHeadlineAssessmentSchema } from '@headlines/models/schemas'
import { settings } from '@headlines/config'
import { instructionBatchHeadlineAssessment } from '@headlines/prompts'

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_HEADLINE_ASSESSMENT,
    systemPrompt: instructionBatchHeadlineAssessment,
    zodSchema: batchHeadlineAssessmentSchema,
  })

async function invoke(input) {
  const agent = getAgent()
  const result = await agent.execute(input.headlines_json_string)
  return result
}

export const batchHeadlineChain = { invoke }
