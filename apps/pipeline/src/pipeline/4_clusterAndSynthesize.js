// apps/pipeline/src/pipeline/4_clusterAndSynthesize.js
import { truncateString, logger } from '@headlines/utils-shared'
import { auditLogger } from '@headlines/utils-server'
import {
  clusteringChain,
  synthesisChain,
  entityExtractorChain,
  opportunityChain,
  findSimilarArticles,
  searchFamilyOfficeForUBO,
  fetchWikipediaSummary,
  findNewsApiArticlesForEvent,
  performGoogleSearch,
  findAlternativeSources,
} from '@headlines/ai-services'
import { settings } from '@headlines/config'
import { SynthesizedEvent, EntityGraph } from '@headlines/models'
import { trackDealLifecycle } from '../modules/dealTracker/index.js'
import mongoose from 'mongoose'

const SIMILARITY_THRESHOLD = 0.9
const EVENT_KEY_HASH_LENGTH = 6
const MAX_HEADLINE_DISPLAY_LENGTH = 60

function generateUniqueEventKey(baseKey) {
  const uniqueHash = new mongoose.Types.ObjectId()
    .toString()
    .slice(-EVENT_KEY_HASH_LENGTH)
  return `${baseKey}-${uniqueHash}`
}

function deduplicateArticles(articles) {
  return Array.from(new Map(articles.map((article) => [article.link, article])).values())
}

async function enrichWithEntityGraph(entities) {
  if (!entities || entities.length === 0) return []
  try {
    const entityRecords = await EntityGraph.find({
      name: { $in: entities.map(e => new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')) }
    }).lean().limit(10)
    
    if (!entityRecords || entityRecords.length === 0) return []
    
    return entityRecords.map(e => ({
      name: e.name,
      type: e.type,
      relationships: (e.relationships || []).slice(0, 5).map(r => `${e.name} → [${r.type}] → ${r.targetName}`)
    }))
  } catch (err) {
    logger.warn({ err: err.message }, '[EntityGraph] Lookup failed')
    return []
  }
}

function extractUniqueWatchlistHits(articles) {
  const allHits = articles.flatMap((article) => article.watchlistHits || [])
  return [...new Set(allHits.map((id) => id.toString()))]
}

function calculateHighestRelevanceScore(articles) {
  return Math.max(...articles.map((article) => article.relevance_article || 0))
}

function getPrimaryCountry(articles) {
  return (articles[0]?.country || [])[0] || 'Unknown'
}

async function enrichWithWikipedia(entities, utilityFunctions) {
  if (entities.length === 0) {
    return { results: [], context: 'Not available.' }
  }
  const results = await Promise.all(
    entities.map((entity) => utilityFunctions.fetchWikipediaSummary(entity))
  )
  const context =
    results
      .filter((result) => result.success)
      .map((result) => result.summary)
      .join('\n---\n') || 'Not available.'
  return { results, context }
}

async function enrichWithNewsApi(headline, utilityFunctions) {
  return utilityFunctions.findNewsApiArticlesForEvent(headline)
}

function determineEnrichmentSources(historicalContext, wikiResults, newsApiResult) {
  const sources = []
  if (historicalContext.length > 0) sources.push('rag_db')
  if (wikiResults.some((result) => result.success)) sources.push('wikipedia')
  if (newsApiResult.success) sources.push('news_api')
  return sources
}

function buildSynthesisContext({
  primaryCountry,
  articles,
  historicalContext,
  wikipediaContext,
  newsApiContext,
  entityGraphContext,
}) {
  return {
    SOURCE_COUNTRY_CONTEXT: `The source newspaper for this event is from ${primaryCountry}. Prioritize this as the event's country unless the text explicitly states otherwise.`,
    "[ TODAY'S NEWS ]": articles.map((article) => {
      const imageCaption = article.imageCaption || article.imageAlt || article.ogImageAlt || article.ogImageAltText || null
      return {
        headline: article.headline,
        source: article.newspaper,
        full_text: article.assessment_article,
        key_individuals: article.key_individuals || [],
        image_caption: imageCaption,
        is_headline_only: article.richness_source === 'headline_only' || (article.assessment_article || '').startsWith('[HEADLINE ONLY]'),
      }
    }),
    '[ HISTORICAL CONTEXT (Internal Database) ]': historicalContext,
    '[ KNOWLEDGE GRAPH (Known Entity Relationships) ]': entityGraphContext,
    '[ PUBLIC WIKIPEDIA CONTEXT ]': wikipediaContext,
    '[ LATEST NEWS CONTEXT (NewsAPI) ]': newsApiContext,
  }
}

function addSynthesisTrace(articles, clusterKey, synthesisInput, articleTraceLogger) {
  const contextTrace = {
    stage: 'Synthesis Context',
    status: 'USED',
    reason: `Clustered into event_key: ${clusterKey}`,
  }
  for (const article of articles) {
    if (article.pipelineTrace) article.pipelineTrace.push(contextTrace)
    if (article._id) {
      articleTraceLogger.addStage(article._id, 'Synthesis Context', {
        cluster_key: clusterKey,
        full_context: synthesisInput,
      })
    }
  }
}

function addLlmOutputTrace(articles, synthesisResult, articleTraceLogger) {
  for (const article of articles) {
    if (article._id) {
      articleTraceLogger.addStage(article._id, 'Synthesis LLM Output', {
        llm_output: synthesisResult,
      })
    }
  }
}

function formatSourceArticles(articles) {
  return articles.map((article) => ({
    headline: article.headline,
    link: article.link,
    newspaper: article.newspaper,
    imageUrl: article.imageUrl,
    country: article.country,
  }))
}

function createEventObject({
  eventData,
  clusterKey,
  articles,
  highestRelevanceScore,
  enrichmentSources,
  uniqueWatchlistHits,
  existingEvent,
}) {
  const eventObj = {
    ...eventData,
    event_key: existingEvent ? existingEvent.event_key : clusterKey,
    synthesized_headline: eventData.headline,
    synthesized_summary: eventData.summary,
    ai_assessment_reason: articles[0].assessment_article,
    highest_relevance_score: highestRelevanceScore,
    source_articles: formatSourceArticles(articles),
    enrichmentSources,
    watchlistHits: uniqueWatchlistHits,
    pipelineTrace: [
      ...(existingEvent ? existingEvent.pipelineTrace : []),
      {
        stage: 'Synthesis',
        status: existingEvent ? 'UPDATED' : 'SUCCESS',
        reason: `Synthesized from ${articles.length} articles.`,
      },
    ],
  }
  
  // GAP 2: Search for family office for each seller UBO
  const sellerUBOs = eventData.transactionDetails?.sellerUBOs || []
  const country = eventObj.country?.[0] || 'Denmark'
  
  if (sellerUBOs.length > 0) {
    for (const seller of sellerUBOs) {
      if (seller.name && seller.name.length > 2) {
        searchFamilyOfficeForUBO(seller.name, country)
          .then(fo => {
            if (fo && fo.name) {
              logger.info(`[FamilyOffice] Found for ${seller.name}: ${fo.name} (confidence: ${fo.confidence})`)
            }
          })
          .catch(err => {
            logger.warn({ err: err.message, seller: seller.name }, '[FamilyOffice] Search failed')
          })
      }
    }
  }
  
  return eventObj
}

function buildOpportunityContext(eventObject, combinedText) {
  return {
    context_text: `Event Key: ${eventObject.event_key}\nSynthesized Event Headline: ${eventObject.synthesized_headline}\nSynthesized Event Summary: ${eventObject.synthesized_summary}\nKey Individuals already identified: ${JSON.stringify(eventObject.key_individuals)}\nSource Article Snippets: ${truncateString(combinedText, settings.LLM_CONTEXT_MAX_CHARS)}`,
    existing_wealth_profile: null,
  }
}

function linkOpportunitiesToEvent(opportunities, eventKey) {
  return (opportunities || []).map((opportunity) => ({
    ...opportunity,
    event_key: eventKey,
  }))
}

async function synthesizeEventsFromCluster(
  articlesInCluster,
  clusterKey,
  runStatsManager,
  articleTraceLogger,
  existingEvent = null,
  isLeanMode = false
) {
  const utilityFunctions = { fetchWikipediaSummary, findNewsApiArticlesForEvent, performGoogleSearch, findAlternativeSources }
  const allSourceArticles = existingEvent
    ? [...existingEvent.source_articles, ...articlesInCluster]
    : articlesInCluster
  const uniqueArticles = deduplicateArticles(allSourceArticles)
  const primaryHeadline = uniqueArticles[0]?.headline || clusterKey
  const primaryCountry = getPrimaryCountry(uniqueArticles)

  logger.info(
    `--- [ Synthesizing from Cluster: "${truncateString(primaryHeadline, MAX_HEADLINE_DISPLAY_LENGTH)}" ] ---`
  )

  const combinedText = uniqueArticles
    .map((article) => `${article.headline}\n${article.assessment_article || ''}`)
    .join('\n\n')

  let historicalContext = []
  let wikiEnrichment = { results: [], context: 'Not available.' }
  let newsApiResult = { success: false, snippets: 'Not available.' }
  let entityGraphContext = 'Not available.'
  let enrichmentSources = []

  if (isLeanMode) {
    logger.warn('[LEAN MODE] Skipping all external RAG enrichment for synthesis.')
  } else {
    const entityResult = await entityExtractorChain({ article_text: combinedText })
    const entities = entityResult.entities || []

    // Phase 2: Resolve target company names to their human founders via Knowledge Graph
    const entityGraphLookups = await Promise.all(
      entities.map(async (name) => {
        try {
          const graphEntry = await EntityGraph.findOne({ name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })
            .select('relationships')
            .lean()
          if (graphEntry?.relationships?.length > 0) {
            const founderRels = graphEntry.relationships.filter(r =>
              r.type.toLowerCase().includes('founder') ||
              r.type.toLowerCase().includes('owner') ||
              r.type.toLowerCase().includes('ceo') ||
              r.type.toLowerCase().includes('chairman')
            )
            if (founderRels.length > 0) {
              return { company: name, relationships: founderRels }
            }
          }
          return null
        } catch { return null }
      })
    )
    const foundRelationships = entityGraphLookups.filter(Boolean)
    if (foundRelationships.length > 0) {
      const entityGraphContextLines = [`Found ${foundRelationships.length} companies with known leadership:`]
      for (const found of foundRelationships) {
        entityGraphContextLines.push(`\n${found.company}:`)
        for (const rel of found.relationships) {
          entityGraphContextLines.push(`  - ${rel.targetName} (${rel.type})`)
        }
      }
      entityGraphContext = entityGraphContextLines.join('\n')
      logger.info(`[Synthesize] Knowledge Graph found ${foundRelationships.length} companies with leadership info`)
    }

    historicalContext = await findSimilarArticles(entities.join(', '))
    ;[wikiEnrichment, newsApiResult, entityGraphContext] = await Promise.all([
      enrichWithWikipedia(entities, utilityFunctions),
      enrichWithNewsApi(primaryHeadline, utilityFunctions),
      enrichWithEntityGraph(entities),
    ])
    enrichmentSources = determineEnrichmentSources(
      historicalContext,
      wikiEnrichment.results,
      newsApiResult
    )
    if (entityGraphContext.length > 0) enrichmentSources.push('knowledge_graph')
  }

  const synthesisInput = buildSynthesisContext({
    primaryCountry,
    articles: uniqueArticles,
    historicalContext,
    wikipediaContext: wikiEnrichment.context,
    newsApiContext: newsApiResult.snippets,
    entityGraphContext,
  })

  addSynthesisTrace(uniqueArticles, clusterKey, synthesisInput, articleTraceLogger)
  const synthesisResult = await synthesisChain({
    context_json_string: JSON.stringify(synthesisInput),
    fallbackModel: settings.LLM_MODEL_FALLBACK,
  })
  addLlmOutputTrace(uniqueArticles, synthesisResult, articleTraceLogger)

  if (!synthesisResult || synthesisResult.error || !synthesisResult.events) {
    logger.warn({ details: synthesisResult?.error }, 'Synthesis failed for cluster.')
    return []
  }

  const highestRelevanceScore = calculateHighestRelevanceScore(uniqueArticles)
  const uniqueWatchlistHits = extractUniqueWatchlistHits(uniqueArticles)
  const finalEventsAndOpportunities = []

  for (const eventData of synthesisResult.events) {
    runStatsManager.increment('eventsSynthesized')
    const eventObject = createEventObject({
      eventData,
      clusterKey,
      articles: uniqueArticles,
      highestRelevanceScore,
      enrichmentSources,
      uniqueWatchlistHits,
      existingEvent,
    })
    const opportunityInput = buildOpportunityContext(eventObject, combinedText)
    const opportunityResult = await opportunityChain(opportunityInput)
    runStatsManager.push('synthesizedEventsForReport', {
      synthesized_headline: eventObject.synthesized_headline,
      highest_relevance_score: eventObject.highest_relevance_score,
    })
    const opportunitiesWithKey = linkOpportunitiesToEvent(
      opportunityResult.opportunities,
      eventObject.event_key
    )
    finalEventsAndOpportunities.push({
      event: eventObject,
      opportunities: opportunitiesWithKey,
    })
  }
  return finalEventsAndOpportunities
}

function filterRelevantArticles(articles) {
  return articles.filter(
    (article) => article.relevance_article >= settings.ARTICLES_RELEVANCE_THRESHOLD
  )
}

function prepareClusteringPayload(articles) {
  return articles.map((article) => ({
    id: article._id.toString(),
    headline: article.headline,
    summary: article.assessment_article || '',
  }))
}

function isValidClusteringResult(clusteringResult) {
  return !clusteringResult.error && clusteringResult.events
}

function findArticlesInCluster(articleIds, allArticles) {
  return articleIds
    .map((id) => allArticles.find((article) => article._id.toString() === id))
    .filter(Boolean)
}

function selectPrimaryArticle(articles) {
  return articles.reduce((prev, current) =>
    (prev.relevance_article || 0) > (current.relevance_article || 0) ? prev : current
  )
}

function shouldMergeWithExistingEvent(bestMatch) {
  return (
    bestMatch &&
    typeof bestMatch.id === 'string' &&
    bestMatch.id.startsWith('event_') &&
    bestMatch.score > SIMILARITY_THRESHOLD
  )
}

function extractEventId(matchId) {
  return matchId.replace('event_', '')
}

function addToClusterMap(clusters, key, articles, existingEvent) {
  if (clusters.has(key)) {
    clusters.get(key).articles.push(...articles)
  } else {
    clusters.set(key, { articles, existingEvent })
  }
}

async function processCluster(cluster, allArticles, finalClusters) {
  const articlesInCluster = findArticlesInCluster(cluster.article_ids, allArticles)
  if (articlesInCluster.length === 0) return

  const primaryArticle = selectPrimaryArticle(articlesInCluster)

  // --- START OF DEFINITIVE FIX ---
  // The check for `isLeanMode` was incorrectly placed here, disabling a core pipeline feature.
  // Event evolution (checking for duplicates via Pinecone) is fast and essential for data quality.
  // It should ALWAYS run, regardless of any test flags. This `if` block is removed.
  const similarEvents = await findSimilarArticles(primaryArticle.headline)
  const bestMatch = similarEvents.length > 0 ? similarEvents[0] : null
  if (shouldMergeWithExistingEvent(bestMatch)) {
    const existingEventId = extractEventId(bestMatch.id)
    logger.info(
      `[Event Evolution] New cluster for "${primaryArticle.headline}" matches existing event ID ${existingEventId} with score ${bestMatch.score}. Merging.`
    )
    const existingEvent = await SynthesizedEvent.findById(existingEventId).lean()
    if (existingEvent) {
      addToClusterMap(
        finalClusters,
        existingEvent.event_key,
        articlesInCluster,
        existingEvent
      )
      return
    }
  }
  // --- END OF DEFINITIVE FIX ---

  const uniqueKey = generateUniqueEventKey(cluster.event_key)
  addToClusterMap(finalClusters, uniqueKey, articlesInCluster, null)
}

async function synthesizeAllClusters(
  clusters,
  runStatsManager,
  articleTraceLogger,
  isLeanMode = false
) {
  const synthesisPromises = []
  for (const [key, { articles, existingEvent }] of clusters.entries()) {
    synthesisPromises.push(
      synthesizeEventsFromCluster(
        articles,
        key,
        runStatsManager,
        articleTraceLogger,
        existingEvent,
        isLeanMode
      )
    )
  }
  const results = await Promise.all(synthesisPromises)
  return results.flat()
}

function separateEventsAndOpportunities(results, emitter) {
  const events = []
  const opportunities = []
  for (const result of results) {
    if (result) {
      events.push(result.event)
      opportunities.push(...result.opportunities)
      if (emitter && result.event) {
        emitter.eventCreated(result.event)
      }
    }
  }
  return { events, opportunities }
}

export async function runClusterAndSynthesize(pipelinePayload) {
  logger.info('--- STAGE 4: CLUSTER & SYNTHESIZE (with Event Evolution) ---')

  const {
    runStatsManager,
    enrichedArticles,
    articleTraceLogger,
    lean: isLeanMode,
    emitter,
    dbConnection,
  } = pipelinePayload

  // Fetch orphaned enriched articles from DB — articles enriched in a previous run
  // but never clustered (no eventId). This prevents them from being permanently lost.
  // RECENCY GUARD: Only articles created in the last 30 days. Old leaked orphans
  // (from crash cycles without enrichedAt timestamps) silently produce PE-to-PE
  // events that the judge always rejects as IRRELEVANT. This saves $0.10+/run
  // and prevents stale articles from circling through clustering forever.
  const orphanRecencyCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  let orphanedEnrichedArticles = []
  try {
    const { Article } = await import('@headlines/models')
    orphanedEnrichedArticles = await Article.find({
      status: 'enriched',
      eventId: { $exists: false },
      relevance_article: { $gte: settings.ARTICLES_RELEVANCE_THRESHOLD },
      createdAt: { $gte: orphanRecencyCutoff }
    })
      .select('+articleContent')
      .lean()
      .limit(100)
      .catch(() => [])
    if (orphanedEnrichedArticles.length > 0) {
      logger.info(`▸ Found ${orphanedEnrichedArticles.length} orphaned enriched articles (no eventId) from database.`)
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to fetch orphaned enriched articles')
  }

  const allEnriched = [...(enrichedArticles || []), ...orphanedEnrichedArticles]
  // Deduplicate by _id
  const seen = new Set()
  const articlesForProcessing = allEnriched.filter((article) => {
    const id = article._id?.toString()
    if (seen.has(id)) return false
    seen.add(id)
    return article.relevance_article >= settings.ARTICLES_RELEVANCE_THRESHOLD
  })

  if (articlesForProcessing.length === 0) {
    logger.info('No relevant articles were promoted for synthesis stage.')
    pipelinePayload.synthesizedEvents = []
    pipelinePayload.opportunitiesToSave = []
    return { success: true, payload: pipelinePayload }
  }

  // Limit clustering batch to prevent DeepSeek v4-flash from exhausting
  // its reasoning token budget. With >40 articles, the model spends all
  // 8192 completion tokens on reasoning and returns empty content.
  const MAX_CLUSTER_BATCH = 40
  const batchForClustering = articlesForProcessing.length > MAX_CLUSTER_BATCH
    ? articlesForProcessing.slice(0, MAX_CLUSTER_BATCH)
    : articlesForProcessing
  if (articlesForProcessing.length > MAX_CLUSTER_BATCH) {
    logger.info(`▸ Clustering batch limited to ${MAX_CLUSTER_BATCH}/${articlesForProcessing.length} articles (remaining will queue for next run).`)
  }

  const articlePayload = prepareClusteringPayload(batchForClustering)
  const clusteringResult = await clusteringChain({
    articles_json_string: JSON.stringify(articlePayload),
  })

  if (!isValidClusteringResult(clusteringResult)) {
    logger.error(
      { err: clusteringResult.error, rawResponse: clusteringResult },
      'Clustering Agent failed to produce a valid response. Skipping synthesis stage.'
    )
    runStatsManager.push(
      'errors',
      'Clustering Agent Failed: ' +
        (clusteringResult.error || 'No events array in response')
    )
    pipelinePayload.synthesizedEvents = []
    pipelinePayload.opportunitiesToSave = []
    return { success: true, payload: pipelinePayload }
  }

  const initialClusters = clusteringResult.events
  runStatsManager.set('eventsClustered', initialClusters.length)
  logger.info(
    { details: initialClusters },
    `Clustered ${articlesForProcessing.length} articles into ${initialClusters.length} initial unique events.`
  )

  const finalClusters = new Map()
  for (const cluster of initialClusters) {
    await processCluster(cluster, articlesForProcessing, finalClusters)
  }

  const synthesisResults = await synthesizeAllClusters(
    finalClusters,
    runStatsManager,
    articleTraceLogger,
    isLeanMode
  )
  const { events, opportunities } = separateEventsAndOpportunities(synthesisResults)

  pipelinePayload.synthesizedEvents = events
  pipelinePayload.opportunitiesToSave = opportunities

  // Deal lifecycle tracking
  if (events.length > 0) {
    for (const event of events) {
      await trackDealLifecycle(event, event.relatedCompanies || [])
    }
  }

  return { success: true, payload: pipelinePayload }
}
