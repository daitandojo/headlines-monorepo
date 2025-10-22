// packages/ai-services/src/chains/graphUpdaterChain.js
import { z } from 'zod'
import { AIAgent } from '../lib/AIAgent.js'
import { instructionGraphUpdater } from '@headlines/prompts'
import { settings } from '@headlines/config'

const graphUpdaterSchema = z.object({
  entities: z
    .array(z.string())
    .describe('An array of all unique canonical entity names found.'),
  relationships: z
    .array(
      z.tuple([
        z.string(), // Subject
        z.string(), // Predicate (Relationship Type)
        z.string(), // Object
      ])
    )
    .describe('An array of Subject-Predicate-Object triples representing relationships.'),
})

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_UTILITY,
    systemPrompt: instructionGraphUpdater,
    zodSchema: graphUpdaterSchema,
  })

async function invoke(input) {
  const agent = getAgent()
  // The userContent is the synthesized summary of an event
  const result = await agent.execute(input.event_summary)
  return result
}

export const graphUpdaterChain = { invoke }
