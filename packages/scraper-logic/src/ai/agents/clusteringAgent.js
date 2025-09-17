// packages/scraper-logic/src/ai/agents/clusteringAgent.js (version 2.2.1)
import { getConfig } from '../../config.js';
import { AIAgent } from '../AIAgent.js'
import { clusterSchema } from '../schemas/clusterSchema.js'
import { env } from '../../../../config/src/index.js'
import { instructionCluster } from '../../../../prompts/src/index.js'

const getAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_ARTICLE_ASSESSMENT,
    systemPrompt: instructionCluster,
    zodSchema: clusterSchema,
  })

export async function clusterArticlesIntoEvents(articles) {
  const articleClusterAgent = getAgent()
  getConfig().logger.info(`Clustering ${articles.length} articles into unique events...`)
  const CLUSTER_BATCH_SIZE = 25
  const batches = []
  for (let i = 0; i < articles.length; i += CLUSTER_BATCH_SIZE) {
    batches.push(articles.slice(i, i + CLUSTER_BATCH_SIZE))
  }
  getConfig().logger.info(`Processing clusters in ${batches.length} batches.`)

  const allClusters = []
  for (const [index, batch] of batches.entries()) {
    getConfig().logger.info(`Clustering batch ${index + 1} of ${batches.length}...`)
    const articlePayload = batch.map((a) => ({
      id: a._id.toString(),
      headline: a.headline,
      source: a.newspaper,
      summary: (a.topic || a.assessment_article || '').substring(0, 400),
    }))
    const userContent = JSON.stringify(articlePayload)
    const response = await articleClusterAgent.execute(userContent)

    if (response.error || !response.events) {
      getConfig().logger.error(`Failed to cluster articles in batch ${index + 1}.`, { response })
      continue
    }
    allClusters.push(...response.events)
  }

  if (allClusters.length === 0) {
    getConfig().logger.warn('Failed to cluster any articles across all batches.')
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
