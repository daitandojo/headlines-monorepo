// packages/scraper-logic/src/ai/agents/entityAgent.js (version 3.1.2)
import { AIAgent } from '../AIAgent.js'
import { entitySchema } from '../schemas/entitySchema.js'
import { canonicalizerSchema } from '../schemas/canonicalizerSchema.js'
import { env } from '@headlines/config'
import { instructionEntity } from '@headlines/prompts'
import { instructionCanonicalizer } from '@headlines/prompts'
// DEFINITIVE FIX: Removed the duplicate import of getConfig.
import { getConfig } from '../../config.js'

const getEntityExtractorAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_UTILITY,
    systemPrompt: instructionEntity,
    zodSchema: entitySchema,
  })

const getEntityCanonicalizerAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_UTILITY,
    systemPrompt: instructionCanonicalizer,
    zodSchema: canonicalizerSchema,
  })

export const entityCanonicalizerAgent = () => getEntityCanonicalizerAgent()

export async function extractEntities(text) {
  const entityExtractorAgent = getEntityExtractorAgent()
  const canonicalizer = getEntityCanonicalizerAgent()

  if (!text) return []
  try {
    const response = await entityExtractorAgent.execute(`Article Text:\n${text}`)

    if (response.error) {
      throw new Error(response.error)
    }

    const { reasoning, entities } = response
    getConfig().logger.info(`[Query Planner Agent] Reasoning: ${reasoning}`)
    if (!entities || !Array.isArray(entities)) return []

    const canonicalizationPromises = entities
      .map((entity) => entity.replace(/\s*\(.*\)\s*/g, '').trim())
      .filter(Boolean)
      .map(async (entity) => {
        const canonResponse = await canonicalizer.execute(entity)
        if (canonResponse && !canonResponse.error && canonResponse.canonical_name) {
          getConfig().logger.trace(
            `Canonicalized "${entity}" -> "${canonResponse.canonical_name}"`
          )
          return canonResponse.canonical_name
        }
        return null
      })

    const canonicalEntities = await Promise.all(canonicalizationPromises)
    const uniqueEntities = [...new Set(canonicalEntities.filter(Boolean))]

    getConfig().logger.info(
      { entities: uniqueEntities },
      `Final list of canonical entities for RAG.`
    )
    return uniqueEntities
  } catch (error) {
    getConfig().logger.warn(
      { err: error },
      'Wikipedia query planning (entity extraction) failed.'
    )
    return []
  }
}
