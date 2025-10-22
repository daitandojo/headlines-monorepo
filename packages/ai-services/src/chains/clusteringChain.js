// packages/ai-services/src/chains/clusteringChain.js
import { z } from 'zod'
import { AIAgent } from '../lib/AIAgent.js'
import { instructionCluster } from '@headlines/prompts'
import { settings } from '@headlines/config'
import { logger } from '@headlines/utils-shared'

// This schema correctly matches the detailed prompt's output requirement.
const clusterSchema = z.object({
  events: z.array(
    z.object({
      event_key: z.string(),
      article_ids: z.array(z.string()),
    })
  ),
})

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_SYNTHESIS, // Clustering is a complex task
    systemPrompt: instructionCluster,
    zodSchema: clusterSchema,
  })

async function invoke(input) {
  const agent = getAgent()
  const result = await agent.execute(input.articles_json_string)

  // The AIAgent's execute method already handles retries, validation, and error logging.
  // The output will either be the successfully validated data or an object with an `error` key.
  return result
}

export const clusteringChain = { invoke }
