// packages/ai-services/src/chains/dossierUpdateChain.js
import { AIAgent } from '../lib/AIAgent.js'
import { instructionDossierUpdate } from '@headlines/prompts'
import { opportunitySchema } from '@headlines/models/schemas'
import { settings } from '@headlines/config'
import { logger } from '@headlines/utils-shared'

// --- START OF DEFINITIVE FIX ---
// The previous agent was too slow and complex, causing timeouts.
// This new version uses a faster model and a simplified task (re-generation instead of merging)
// to ensure reliability and speed.
const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_SYNTHESIS, // Use the faster, more reliable synthesis model
    systemPrompt: instructionDossierUpdate,
    zodSchema: opportunitySchema,
  })
// --- END OF DEFINITIVE FIX ---

async function invoke(input) {
  const agent = getAgent()
  const userContent = `Existing Dossier (JSON):\n\`\`\`${input.existing_dossier_json}\`\`\`\n\nNew Intelligence Brief (Text):\n\`\`\`${input.new_intelligence_text}\`\`\``
  const result = await agent.execute(userContent)

  if (result.error) {
    return result
  }

  if (
    Array.isArray(result.opportunities) &&
    result.opportunities.length > 0 &&
    Array.isArray(result.opportunities[0])
  ) {
    logger.warn(
      { agent: 'dossierUpdateChain' },
      'Detected nested array in opportunities output. Flattening to correct.'
    )
    result.opportunities = result.opportunities.flat()
  }

  return result
}

export const dossierUpdateChain = { invoke }
