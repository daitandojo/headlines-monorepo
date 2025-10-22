// packages/ai-services/src/chains/opportunityChain.js
import { z } from 'zod'
import { AIAgent } from '../lib/AIAgent.js'
import { settings } from '@headlines/config'
import { logger } from '@headlines/utils-shared'

// --- START OF MODIFICATION ---
// A new, leaner schema and prompt specifically for the fast, in-pipeline chain.
const simpleOpportunitySchema = z.object({
  opportunities: z.array(
    z
      .object({
        reachOutTo: z.string(),
        contactDetails: z
          .union([
            z.string(),
            z.object({
              role: z.string().nullable(),
              company: z.string().nullable(),
            }),
          ])
          .transform((val) => {
            if (typeof val === 'string') {
              return { role: val, company: null }
            }
            return val
          })
          .default({}),
        lastKnownEventLiquidityMM: z.number().nullable(),
        whyContact: z
          .union([z.string(), z.array(z.string())])
          .transform((val) => (Array.isArray(val) ? val : [val])),
        event_key: z.string().optional(),
      })
      .passthrough()
  ),
})

const simpleInstruction = {
  whoYouAre: `You are a high-speed intelligence extraction engine. Your task is to extract critical, Tier-1 data points about individuals from a text.`,
  whatYouDo: `From the provided text, extract ONLY the following for each relevant individual: their full name, their role/company, the liquidity from this event, and a reason to contact them. Be fast and precise. Ignore biographical details.`,
  outputFormatDescription: `Respond ONLY with a valid JSON object with a single key "opportunities", which is an array of objects containing ONLY 'reachOutTo', 'contactDetails', 'lastKnownEventLiquidityMM', and 'whyContact'. The 'whyContact' field MUST be an array of strings.`,
}

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_SYNTHESIS, // Use a powerful but fast model
    systemPrompt: simpleInstruction,
    zodSchema: simpleOpportunitySchema,
  })

async function invoke(input) {
  const agent = getAgent()
  // We no longer need to summarize; we just send the context to the simpler agent.
  const userContent = `New Intelligence Brief (Text):\n\`\`\`${input.context_text}\`\`\``
  const result = await agent.execute(userContent)

  if (result.error) {
    return result
  }

  // Post-processing to ensure the event_key is attached, as the AI no longer handles it.
  if (result.opportunities) {
    const eventKeyMatch = input.context_text.match(/Event Key: ([\w-]+)/)
    if (eventKeyMatch) {
      result.opportunities.forEach((opp) => {
        opp.event_key = eventKeyMatch[1]
      })
    }
  }

  return result
}
// --- END OF MODIFICATION ---

export const opportunityChain = { invoke }
