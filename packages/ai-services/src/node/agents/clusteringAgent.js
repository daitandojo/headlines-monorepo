// packages/ai-services/src/node/agents/clusteringAgent.js
import { logger } from '@headlines/utils-shared'
import { AIAgent } from '../../lib/AIAgent.js'
import { clusterSchema } from '@headlines/models/schemas'
import { settings } from '@headlines/config/node'
import { instructionCluster } from '@headlines/prompts'

const CLUSTER_BATCH_SIZE = 25

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_SYNTHESIS,
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
