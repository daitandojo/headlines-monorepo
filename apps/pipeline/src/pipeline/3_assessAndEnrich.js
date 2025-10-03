// apps/pipeline/src/pipeline/3_assessAndEnrich.js
import { truncateString, sleep } from '@headlines/utils-shared'
import { logger } from '@headlines/utils-shared'
import { settings } from '@headlines/config/node'
import { Article, WatchlistEntity } from '@headlines/models'
import { batchHeadlineChain } from '@headlines/ai-services/node'
import { processSingleArticle } from './submodules/processSingleArticle.js'
import pLimit from 'p-limit'
import { env } from '@headlines/config/node'

const BATCH_SIZE = 8
const MAX_RETRIES = 1

async function withRetry(fn, retries = MAX_RETRIES) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === retries) {
        throw error
      }
      logger.warn(
        `Operation failed. Retrying in 2 seconds... (Attempt ${i + 1}/${retries})`
      )
      await sleep(2000)
    }
  }
}

function findWatchlistHits(text, country, watchlistEntities) {
  const hits = new Map()
  const lowerText = text.toLowerCase()

  const createSearchRegex = (term) =>
    new RegExp(`\\b${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')

  const relevantEntities = watchlistEntities.filter(
    (entity) =>
      !entity.country ||
      entity.country === country ||
      entity.country === 'Global PE' ||
      entity.country === 'M&A Aggregators'
  )

  for (const entity of relevantEntities) {
    const terms = [entity.name.toLowerCase(), ...(entity.searchTerms || [])]
      .map((t) => t.trim())
      .filter(Boolean)
    for (const term of terms) {
      if (term.length > 3 && createSearchRegex(term).test(lowerText)) {
        if (!hits.has(entity.name)) hits.set(entity.name, { entity, matchedTerm: term })
      }
    }
  }
  return Array.from(hits.values())
}

export async function runAssessAndEnrich(pipelinePayload) {
  logger.info('--- STAGE 3: ASSESS & ENRICH ---')
  const { runStatsManager, articlesForPipeline } = pipelinePayload // CORRECTED

  if (!articlesForPipeline || articlesForPipeline.length === 0) {
    pipelinePayload.enrichedArticles = []
    return { success: true, payload: pipelinePayload }
  }

  const watchlistEntities = await WatchlistEntity.find({ status: 'active' }).lean()

  const syntheticArticles = articlesForPipeline.filter(
    (a) => a.source === 'Richlist Ingestion'
  )
  const realArticles = articlesForPipeline.filter(
    (a) => a.source !== 'Richlist Ingestion'
  )

  logger.info(
    `Processing ${realArticles.length} real articles and ${syntheticArticles.length} synthetic articles.`
  )

  let assessedCandidates = []

  if (realArticles.length > 0) {
    logger.info(
      `Assessing ${realArticles.length} real headlines in batches of ${BATCH_SIZE}...`
    )
    const batches = []
    for (let i = 0; i < realArticles.length; i += BATCH_SIZE) {
      batches.push(realArticles.slice(i, i + BATCH_SIZE))
    }

    for (const [index, batch] of batches.entries()) {
      logger.info(`Assessing batch ${index + 1} of ${batches.length}...`)
      try {
        const batchProcessor = async () => {
          const batchWithContext = batch.map((article) => {
            const hits = findWatchlistHits(
              article.headline,
              article.country,
              watchlistEntities
            )
            let headlineWithContext = `[COUNTRY CONTEXT: ${article.country}] ${article.headline}`
            if (hits.length > 0) {
              const hitStrings = hits
                .map(
                  (hit) =>
                    `[WATCHLIST HIT: ${hit.entity.name} (matched on '${hit.matchedTerm}')]`
                )
                .join(' ')
              headlineWithContext = `${hitStrings} ${headlineWithContext}`
            }
            return { ...article, headlineWithContext, hits }
          })

          const response = await batchHeadlineChain({
            headlines_json_string: JSON.stringify(
              batchWithContext.map((a) => a.headlineWithContext)
            ),
          })

          if (
            response.error ||
            !response.assessments ||
            response.assessments.length !== batch.length
          ) {
            throw new Error('Batch assessment failed or returned mismatched count.')
          }

          const batchResults = batchWithContext.map((originalArticle, i) => {
            const assessment = response.assessments[i]
            if (originalArticle.hits.length > 0) {
              let score = assessment.relevance_headline
              score = Math.min(100, score + settings.WATCHLIST_SCORE_BOOST)
              assessment.assessment_headline = `Watchlist boost (+${settings.WATCHLIST_SCORE_BOOST}). ${assessment.assessment_headline}`
              assessment.relevance_headline = score
            }
            return { ...originalArticle, ...assessment }
          })
          return batchResults
        }

        const results = await withRetry(batchProcessor)
        assessedCandidates.push(...results)
      } catch (batchError) {
        logger.error(
          { err: batchError },
          `Batch ${index + 1} failed after all retries. FALLING BACK to single-article assessment.`
        )
        const fallbackPromises = batch.map((article) => {
          const hits = findWatchlistHits(
            article.headline,
            article.country,
            watchlistEntities
          )
          return processSingleArticle(article, hits)
        })
        const fallbackResults = await Promise.all(fallbackPromises)

        fallbackResults.forEach((result, i) => {
          const originalArticle = batch[i]
          if (result.article) {
            assessedCandidates.push({ ...originalArticle, ...result.article })
          } else {
            assessedCandidates.push({
              ...originalArticle,
              relevance_headline: 0,
              assessment_headline: result.lifecycleEvent.reason,
            })
          }
        })
      }
    }
  }

  runStatsManager.set('headlinesAssessed', assessedCandidates.length) // CORRECTED

  logger.info('--- Headline Assessment Complete ---')
  assessedCandidates.forEach((article) => {
    const status =
      article.relevance_headline >= settings.HEADLINES_RELEVANCE_THRESHOLD
        ? 'PASSED'
        : 'DROPPED'
    const color = status === 'PASSED' ? '\x1b[32m' : '\x1b[90m'
    logger.info(
      `${color}[${status.padEnd(7)}] [Score: ${String(article.relevance_headline).padStart(3)}] "${truncateString(article.headline, 60)}" (${article.assessment_headline})\x1b[0m`
    )
  })

  const relevantCandidates = assessedCandidates.filter(
    (a) => a.relevance_headline >= settings.HEADLINES_RELEVANCE_THRESHOLD
  )
  runStatsManager.set('relevantHeadlines', relevantCandidates.length) // CORRECTED

  const enrichmentQueue = [...relevantCandidates, ...syntheticArticles]

  logger.info(
    `Found ${relevantCandidates.length} relevant headlines. Total for full enrichment (including synthetic): ${enrichmentQueue.length}.`
  )
  if (enrichmentQueue.length === 0) {
    pipelinePayload.enrichedArticles = []
    return { success: true, payload: pipelinePayload }
  }

  const limit = pLimit(env.CONCURRENCY_LIMIT)
  const processingPromises = enrichmentQueue.map((article) =>
    limit(() => {
      const hits =
        article.hits ||
        findWatchlistHits(article.headline, article.country, watchlistEntities)
      return processSingleArticle(article, hits)
    })
  )
  const results = await Promise.all(processingPromises)

  const enrichedArticles = []
  const articleUpdates = []
  let enrichmentOutcomes = [] // Local variable

  logger.info('--- Full Article Enrichment Results ---')
  results.forEach((result, index) => {
    const originalArticle = enrichmentQueue[index]
    const finalArticleState = {
      ...originalArticle,
      ...(result.article || {}),
      pipeline_lifecycle: [
        ...(originalArticle.pipeline_lifecycle || []),
        result.lifecycleEvent,
      ],
    }
    const outcome = result.lifecycleEvent.status

    enrichmentOutcomes.push({
      link: finalArticleState.link,
      headline: finalArticleState.headline,
      newspaper: finalArticleState.newspaper,
      headlineScore: finalArticleState.relevance_headline,
      assessment_headline: finalArticleState.assessment_headline,
      finalScore: finalArticleState.relevance_article,
      assessment_article: finalArticleState.assessment_article,
      content_snippet: truncateString(result.contentPreview, 200),
      outcome: outcome,
      reason: result.lifecycleEvent.reason,
    })

    if (outcome === 'success') {
      enrichedArticles.push(finalArticleState)
      logger.info(
        `✅ [SUCCESS] "${truncateString(originalArticle.headline, 60)}" - Final Score: ${finalArticleState.relevance_article}`
      )
    } else {
      logger.warn(
        `❌ [${outcome.toUpperCase()}] "${truncateString(originalArticle.headline, 60)}" - Reason: ${result.lifecycleEvent.reason}`
      )
    }

    if (result.article || result.lifecycleEvent) {
      articleUpdates.push({
        updateOne: {
          filter: { _id: originalArticle._id },
          update: { $set: finalArticleState },
        },
      })
    }
  })

  runStatsManager.set('enrichmentOutcomes', enrichmentOutcomes) // CORRECTED

  if (articleUpdates.length > 0) {
    // In-memory articles don't exist in DB yet, so bulkWrite won't work.
    // This state is now managed entirely within the payload.
  }

  runStatsManager.set('articlesEnriched', enrichedArticles.length) // CORRECTED
  runStatsManager.set('relevantArticles', enrichedArticles.length) // CORRECTED

  logger.info(
    `Enrichment complete. Successfully enriched ${enrichedArticles.length} of ${enrichmentQueue.length} candidates.`
  )
  pipelinePayload.enrichedArticles = enrichedArticles
  pipelinePayload.assessedCandidates = assessedCandidates

  return { success: true, payload: pipelinePayload }
}
