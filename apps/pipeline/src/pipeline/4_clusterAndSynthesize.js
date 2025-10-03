// apps/pipeline/src/pipeline/4_clusterAndSynthesize.js
import { truncateString, logger } from '@headlines/utils-shared' // The universal, isomorphic logger
import { auditLogger } from '@headlines/utils-server' // The server-only, file-writing audit logger

import {
  clusteringChain,
  synthesisChain,
  entityExtractorChain,
  opportunityChain,
  findSimilarArticles,
} from '@headlines/ai-services'
import { settings } from '@headlines/config'
import { getConfig } from '@headlines/scraper-logic/config.js'

async function synthesizeEventsFromCluster(articlesInCluster, clusterKey, runStatsManager) {
  const config = getConfig()
  const primaryHeadline = articlesInCluster[0]?.headline || clusterKey
  const primaryCountry = articlesInCluster[0]?.country || 'Unknown'
  logger.info(
    `--- [ Synthesizing from Cluster: "${truncateString(primaryHeadline, 60)}" ] ---`
  )

  const uniqueArticlesInCluster = Array.from(
    new Map(articlesInCluster.map((a) => [a.link, a])).values()
  )
  const combinedText = uniqueArticlesInCluster
    .map((a) => `${a.headline}\n${a.assessment_article}`)
    .join('\n\n')

  const entityResult = await entityExtractorChain({ article_text: combinedText })
  const entities = entityResult.entities || []

  const historicalContext = await findSimilarArticles(entities.join(', '))
  const [wikiResults, newsApiResult] = await Promise.all([
    entities.length > 0
      ? Promise.all(entities.map((e) => config.utilityFunctions.fetchWikipediaSummary(e)))
      : Promise.resolve([]),
    config.utilityFunctions.findNewsApiArticlesForEvent(primaryHeadline),
  ])

  const enrichmentSources = []
  if (historicalContext.length > 0) enrichmentSources.push('rag_db')
  if (wikiResults.some((r) => r.success)) enrichmentSources.push('wikipedia')
  if (newsApiResult.success) enrichmentSources.push('news_api')

  const wikipediaContext =
    wikiResults
      .filter((r) => r.success)
      .map((r) => r.summary)
      .join('\n---\n') || 'Not available.'
  const newsApiContext = newsApiResult.snippets

  const synthesisInput = {
    SOURCE_COUNTRY_CONTEXT: `The source newspaper for this event is from ${primaryCountry}. Prioritize this as the event's country unless the text explicitly states otherwise.`,
    "[ TODAY'S NEWS ]": uniqueArticlesInCluster.map((a) => ({
      headline: a.headline,
      source: a.newspaper,
      full_text: a.assessment_article,
      key_individuals: a.key_individuals || [],
    })),
    '[ HISTORICAL CONTEXT (Internal Database) ]': historicalContext,
    '[ PUBLIC WIKIPEDIA CONTEXT ]': wikipediaContext,
    '[ LATEST NEWS CONTEXT (NewsAPI) ]': newsApiContext,
  }

  auditLogger.info(
    { context: { synthesis_input: synthesisInput } },
    `Synthesis Context for: "${primaryHeadline}"`
  )
  const synthesisResult = await synthesisChain({
    context_json_string: JSON.stringify(synthesisInput),
  })
  auditLogger.info(
    { context: { llm_output: synthesisResult } },
    `Synthesis Verdict for: "${primaryHeadline}"`
  )

  if (!synthesisResult || synthesisResult.error || !synthesisResult.events) {
    logger.warn({ details: synthesisResult?.error }, 'Synthesis failed for cluster.')
    return []
  }

  const highestScoreInCluster = Math.max(
    ...uniqueArticlesInCluster.map((a) => a.relevance_article || 0)
  )

  const finalEventsAndOpps = []

  for (const [index, eventData] of synthesisResult.events.entries()) {
    if (highestScoreInCluster < settings.EVENT_RELEVANCE_THRESHOLD) {
      logger.warn(
        {
          score: highestScoreInCluster,
          threshold: settings.EVENT_RELEVANCE_THRESHOLD,
          headline: eventData.headline,
        },
        'Event failed final quality gate. Discarding.'
      )
      continue
    }

    runStatsManager.increment('eventsSynthesized')
    const eventObject = {
      ...eventData,
      event_key: `${clusterKey}-${index}`,
      synthesized_headline: eventData.headline,
      synthesized_summary: eventData.summary,
      ai_assessment_reason: uniqueArticlesInCluster[0].assessment_article,
      highest_relevance_score: highestScoreInCluster,
      source_articles: uniqueArticlesInCluster.map((a) => ({
        headline: a.headline,
        link: a.link,
        newspaper: a.newspaper,
        imageUrl: a.imageUrl,
        country: a.country,
      })),
      enrichmentSources,
    }

    const opportunityInput = {
      context_text: `Event Key: ${eventObject.event_key}\nSynthesized Event Headline: ${eventObject.synthesized_headline}\nSynthesized Event Summary: ${eventObject.synthesized_summary}\nKey Individuals already identified: ${JSON.stringify(eventObject.key_individuals)}\nSource Article Snippets: ${truncateString(combinedText, settings.LLM_CONTEXT_MAX_CHARS)}`,
    }
    const opportunityResult = await opportunityChain(opportunityInput)

    runStatsManager.push('synthesizedEventsForReport', {
      synthesized_headline: eventObject.synthesized_headline,
      highest_relevance_score: eventObject.highest_relevance_score,
    })

    finalEventsAndOpps.push({
      event: eventObject,
      opportunities: opportunityResult.opportunities || [],
    })
  }

  return finalEventsAndOpps
}

export async function runClusterAndSynthesize(pipelinePayload) {
  logger.info('--- STAGE 4: CLUSTER & SYNTHESIZE ---')
  const { runStatsManager, enrichedArticles } = pipelinePayload // CORRECTED

  const articlesForProcessing = enrichedArticles.filter(
    (a) => a.relevance_article >= settings.ARTICLES_RELEVANCE_THRESHOLD
  )
  if (articlesForProcessing.length === 0) {
    logger.info('No relevant articles were promoted for synthesis stage.')
    pipelinePayload.synthesizedEvents = []
    pipelinePayload.opportunitiesToSave = []
    return { success: true, payload: pipelinePayload }
  }

  const fullArticleMap = new Map(articlesForProcessing.map((a) => [a._id.toString(), a]))
  const articlePayload = articlesForProcessing.map((a) => ({
    id: a._id.toString(),
    headline: a.headline,
    source: a.newspaper,
    summary: a.assessment_article || '',
  }))
  const clusterResult = await clusteringChain({
    articles_json_string: JSON.stringify(articlePayload),
  })

  const eventClusters = clusterResult.events || []
  runStatsManager.set('eventsClustered', eventClusters.length) // CORRECTED
  logger.info(
    { details: eventClusters },
    `Clustered ${articlesForProcessing.length} articles into ${eventClusters.length} unique events.`
  )

  const clusteredArticleIds = new Set(eventClusters.flatMap((c) => c.article_ids))
  let synthesizedEvents = []
  let opportunitiesToSave = []

  const synthesisPromises = []

  for (const cluster of eventClusters) {
    const articlesInCluster = cluster.article_ids
      .map((id) => fullArticleMap.get(id))
      .filter(Boolean)
    if (articlesInCluster.length > 0) {
      synthesisPromises.push(
        synthesizeEventsFromCluster(articlesInCluster, cluster.event_key, runStatsManager)
      )
    }
  }

  const singletonArticles = articlesForProcessing.filter(
    (a) =>
      !clusteredArticleIds.has(a._id.toString()) &&
      a.relevance_article >= settings.SINGLETON_RELEVANCE_THRESHOLD
  )
  if (singletonArticles.length > 0) {
    logger.info(
      `Found ${singletonArticles.length} high-quality singleton articles to process as individual events.`
    )
    for (const article of singletonArticles) {
      const event_key = `singleton-${article.newspaper.toLowerCase().replace(/[^a-z0-9]/g, '')}-${article._id.toString()}`
      synthesisPromises.push(synthesizeEventsFromCluster([article], event_key, runStatsManager))
    }
  }

  const results = await Promise.all(synthesisPromises)
  const flattenedResults = results.flat()

  flattenedResults.forEach((result) => {
    if (result) {
      synthesizedEvents.push(result.event)
      opportunitiesToSave.push(...result.opportunities)
    }
  })

  pipelinePayload.synthesizedEvents = synthesizedEvents
  pipelinePayload.opportunitiesToSave = opportunitiesToSave
  return { success: true, payload: pipelinePayload }
}