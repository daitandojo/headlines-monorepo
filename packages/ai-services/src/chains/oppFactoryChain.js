// packages/ai-services/src/chains/oppFactoryChain.js
import { AIAgent } from '../lib/AIAgent.js'
import { instructionOppFactory } from '@headlines/prompts'
import { settings } from '@headlines/config'
import { opportunitySchema } from '@headlines/models/schemas' // This is the rich, unified schema

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_PRO,
    systemPrompt: instructionOppFactory,
    zodSchema: opportunitySchema,
  })

async function invoke(input) {
  const agent = getAgent()
  const userContent = `Target Name: ${input.name}\n\n--- Scraped Articles ---\n${input.articles_text}`
  const result = await agent.execute(userContent)

  // --- START OF HARDENING ---
  // If the AI successfully generates a dossier but fails to provide a 'whyContact' reason,
  // inject a generic fallback to prevent Zod validation failure.
  if (
    result &&
    !result.error &&
    result.opportunities &&
    result.opportunities.length > 0
  ) {
    const opp = result.opportunities[0]
    if (!opp.whyContact || opp.whyContact.length === 0) {
      opp.whyContact = [
        `Identified as a high-value individual (${input.name}) based on recent intelligence signals warranting further research and potential outreach.`,
      ]
    }
  }
  // --- END OF HARDENING ---

  return result
}

export const oppFactoryChain = { invoke }
