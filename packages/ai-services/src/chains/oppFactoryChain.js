// packages/ai-services/src/chains/oppFactoryChain.js
import { AIAgent } from '../lib/AIAgent.js'
import { instructionOppFactory } from '@headlines/prompts'
import { settings } from '@headlines/config'
import { opportunitySchema } from '@headlines/models/schemas'
import { logger } from '@headlines/utils-shared'
import { performGoogleSearch } from '../search/search.js'

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_PRO,
    systemPrompt: instructionOppFactory,
    zodSchema: opportunitySchema,
  })

// --- START OF DEFINITIVE FIX: Re-architecting the OppFactory ---
async function invoke(input) {
  const agent = getAgent()

  // The agent now simply receives the name and the pre-scraped text.
  // The orchestration of scraping is handled by the calling script in the `pipeline` app.
  const userContent = `Target Name: ${input.name}\n\n--- Scraped Research ---\n${input.articles_text}`
  const result = await agent.execute(userContent)

  // Add the fallback for 'whyContact' as a hardening measure.
  if (
    result &&
    !result.error &&
    result.opportunities &&
    result.opportunities.length > 0
  ) {
    const opp = result.opportunities[0]
    if (!opp.whyContact || opp.whyContact.length === 0) {
      opp.whyContact = [
        `Identified as a high-value entity (${input.name}) based on proactive research, warranting further investigation and potential outreach.`,
      ]
    }
  }

  return result
}
// --- END OF DEFINITIVE FIX ---

export const oppFactoryChain = { invoke }