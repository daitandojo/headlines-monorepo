// apps/pipeline/src/pipeline/submodules/commit/4_updateSourceAnalytics.js (version 3.2.0)
import { logger } from '@headlines/utils-shared'
import { settings } from '@headlines/config'
import { updateSourceAnalyticsBatch } from '@headlines/data-access'

export async function updateSourceAnalytics(pipelinePayload) {
  const { runStats, assessedCandidates, articlesForPipeline } = pipelinePayload
  if (!runStats || !runStats.scraperHealth) {
    logger.warn(
      '[Analytics] Missing scraperHealth data. Skipping source analytics update.'
    )
    return
  }

  logger.info('📊 Updating source performance analytics...')

  const analyticsMap = new Map()

  // Step 1: Initialize analytics based on scrape success and total headlines found.
  for (const health of runStats.scraperHealth) {
    analyticsMap.set(health.source, {
      $inc: {
        'analytics.totalRuns': 1,
        'analytics.totalSuccesses': health.success ? 1 : 0,
        'analytics.totalFailures': health.success ? 0 : 1,
        'analytics.totalScraped': 0, // Will be incremented by fresh count
        'analytics.totalRelevant': 0, // Will be incremented by relevant count
      },
      $set: {
        'analytics.lastRunHeadlineCount': health.count,
        'analytics.lastRunRelevantCount': 0,
      },
    })
  }

  // Step 2: Calculate FRESH headlines per source to correctly increment totalScraped.
  const freshHeadlinesBySource = (articlesForPipeline || []).reduce((acc, article) => {
    acc[article.source] = (acc[article.source] || 0) + 1
    return acc
  }, {})

  for (const [sourceName, freshCount] of Object.entries(freshHeadlinesBySource)) {
    if (analyticsMap.has(sourceName)) {
      const data = analyticsMap.get(sourceName)
      data.$inc['analytics.totalScraped'] = freshCount
    }
  }

  // Step 3: Calculate RELEVANT headlines per source.
  if (assessedCandidates && assessedCandidates.length > 0) {
    const relevanceBySource = new Map()
    for (const article of assessedCandidates) {
      if (article.relevance_headline >= settings.HEADLINES_RELEVANCE_THRESHOLD) {
        const currentCount = relevanceBySource.get(article.source) || 0
        relevanceBySource.set(article.source, currentCount + 1)
      }
    }

    for (const [sourceName, relevantCount] of relevanceBySource.entries()) {
      if (analyticsMap.has(sourceName)) {
        const data = analyticsMap.get(sourceName)
        data.$inc['analytics.totalRelevant'] = relevantCount
        data.$set['analytics.lastRunRelevantCount'] = relevantCount
      }
    }
  }

  const bulkOps = []
  for (const [name, update] of analyticsMap.entries()) {
    bulkOps.push({ updateOne: { filter: { name }, update } })
  }

  if (bulkOps.length > 0) {
    const result = await updateSourceAnalyticsBatch(bulkOps)
    if (result.success) {
      logger.info(
        `[Analytics] Successfully updated analytics for ${result.modifiedCount} sources.`
      )
    } else {
      logger.error(
        { err: result.error },
        '[Analytics] Failed to bulk update source analytics.'
      )
    }
  } else {
    logger.info('[Analytics] No sources required analytics updates for this run.')
  }
}
