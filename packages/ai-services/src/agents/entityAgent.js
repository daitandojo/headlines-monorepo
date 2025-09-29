import { logger } from '@headlines/utils-server/node'
import { AIAgent } from '../lib/AIAgent.js'
import { entitySchema } from '../schemas/entitySchema.js'
import { canonicalizerSchema } from '../schemas/canonicalizerSchema.js'
import { settings } from '@headlines/config/node'
import { instructionEntity, instructionCanonicalizer } from '@headlines/prompts'

const getEntityExtractorAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_UTILITY,
    systemPrompt: instructionEntity,
    zodSchema: entitySchema,
  })

const getEntityCanonicalizerAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_UTILITY,
    systemPrompt: instructionCanonicalizer,
    zodSchema: canonicalizerSchema,
  })

// Export the agent instance directly for potential reuse
export const entityCanonicalizerAgent = getEntityCanonicalizerAgent()

export async function extractEntities(text) {
  const entityExtractorAgent = getEntityExtractorAgent()
  // Use the exported agent instance
  const canonicalizer = entityCanonicalizerAgent

  if (!text) return []

  try {
    const response = await entityExtractorAgent.execute(`Article Text:\n${text}`)

    if (response.error) {
      throw new Error(response.error)
    }

    const { reasoning, entities } = response
    logger.info(`[Query Planner Agent] Reasoning: ${reasoning}`)
    if (!entities || !Array.isArray(entities)) return []

    const canonicalizationPromises = entities
      .map((entity) => entity.replace(/\s*\(.*\)\s*/g, '').trim())
      .filter(Boolean)
      .map(async (entity) => {
        const canonResponse = await canonicalizer.execute(entity)
        if (canonResponse && !canonResponse.error && canonResponse.canonical_name) {
          logger.trace(`Canonicalized "${entity}" -> "${canonResponse.canonical_name}"`)
          return canonResponse.canonical_name
        }
        return null
      })

    const canonicalEntities = await Promise.all(canonicalizationPromises)
    const uniqueEntities = [...new Set(canonicalEntities.filter(Boolean))]

    logger.info({ entities: uniqueEntities }, `Final list of canonical entities for RAG.`)
    return uniqueEntities
  } catch (error) {
    logger.warn({ err: error }, 'Wikipedia query planning (entity extraction) failed.')
    return []
  }
}
