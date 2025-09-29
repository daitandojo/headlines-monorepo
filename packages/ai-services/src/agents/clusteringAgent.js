import { logger } from '@headlines/utils-server/node'
import { AIAgent } from '../lib/AIAgent.js'
import { clusterSchema } from '../schemas/clusterSchema.js'
import { settings, LLM_CONTEXT_MAX_CHARS } from '@headlines/config/node'
import { instructionCluster } from '@headlines/prompts'

const CLUSTER_BATCH_SIZE = 25 // This is a processing batch, not a model limit, so it can be defined locally.

const getAgent = () =>
  new AIAgent({
    // Correct: Use the settings object for the model name
    model: settings.LLM_MODEL_SYNTHESIS, // Clustering is a high-level synthesis task
    systemPrompt: instructionCluster,
    zodSchema: clusterSchema,
  })

export async function clusterArticlesIntoEvents(articles) {
  const articleClusterAgent = getAgent()
  logger.info(`Clustering ${articles.length} articles into unique events...`)

  if (!articles || articles.length === 0) {
    return []
  }

  const batches = []
  for (let i = 0; i < articles.length; i += CLUSTER_BATCH_SIZE) {
    batches.push(articles.slice(i, i + CLUSTER_BATCH_SIZE))
  }
  logger.info(`Processing clusters in ${batches.length} batches.`)

  const allClusters = []
  for (const [index, batch] of batches.entries()) {
    logger.info(`Clustering batch ${index + 1} of ${batches.length}...`)
    const articlePayload = batch.map((a) => ({
      id: a._id.toString(),
      headline: a.headline,
      source: a.newspaper,
      // Use a more robust summary, preferring the AI's assessment
      summary: (a.assessment_article || a.assessment_headline || '').substring(0, 400),
    }))
    const userContent = JSON.stringify(articlePayload)
    const response = await articleClusterAgent.execute(userContent)

    if (response.error || !response.events) {
      logger.error(`Failed to cluster articles in batch ${index + 1}.`, {
        response,
      })
      continue
    }
    allClusters.push(...response.events)
  }

  if (allClusters.length === 0) {
    logger.warn('Failed to cluster any articles across all batches.')
    return []
  }

  // De-duplicate clusters that might have been created across batches with the same key
  const finalEventMap = new Map()
  allClusters.forEach((event) => {
    if (finalEventMap.has(event.event_key)) {
      const existing = finalEventMap.get(event.event_key)
      event.article_ids.forEach((id) => existing.article_ids.add(id))
    } else {
      finalEventMap.set(event.event_key, {
        event_key: event.event_key,
        article_ids: new Set(event.article_ids),
      })
    }
  })

  return Array.from(finalEventMap.values()).map((event) => ({
    event_key: event.event_key,
    article_ids: Array.from(event.article_ids),
  }))
}
