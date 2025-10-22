// packages/ai-services/src/chains/wealthPredictorChain.js
import { AIAgent } from '../lib/AIAgent.js'
import { instructionWealthPredictor } from '@headlines/prompts'
import { settings } from '@headlines/config'
import { wealthPredictorSchema } from '@headlines/models/schemas' // CORRECTED IMPORT

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_UTILITY, // Fast and cheap for classification
    systemPrompt: instructionWealthPredictor,
    zodSchema: wealthPredictorSchema,
  })

async function invoke(input) {
  const agent = getAgent()
  const userContent = `Person's Name: "${input.name}"\n\nContext from article or entity graph: "${input.context}"`
  const result = await agent.execute(userContent)
  return result
}

export const wealthPredictorChain = { invoke }
