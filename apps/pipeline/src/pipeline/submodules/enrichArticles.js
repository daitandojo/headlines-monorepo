// apps/pipeline/src/pipeline/submodules/enrichArticles.js
import { logger } from '@headlines/utils-shared'
import { truncateString } from '@headlines/utils-shared'
import { bulkWriteArticles } from '@headlines/data-access'
import { processSingleArticle } from './processSingleArticle.js'
import pLimit from 'p-limit'
import { env } from '@headlines/config'

export async function enrichArticles(
  relevantCandidates,
  syntheticArticles,
  articleTraceLogger
) {
  const enrichmentQueue = [...relevantCandidates, ...(syntheticArticles || [])]
  
  if (enrichmentQueue.length === 0) {
    logger.info('▸ No articles in enrichment queue')
    return { enrichedArticles: [], allProcessedArticles: [], enrichmentOutcomes: [] }
  }
  
  const skipCount = enrichmentQueue.length
  const processedCount = 0

  const needsEnrichment = enrichmentQueue.filter((article) => {
    if (article.status === 'enriched' || article.status === 'pending_notification' || article.status === 'completed') {
      logger.info(`\x1b[90m  ⊘ Skip (already enriched/notification):\x1b[0m "${article.headline?.substring(0, 50)}"`)
      return false
    }
    if (article.status === 'failed_enrichment') {
      const failedAttempts = (article.pipelineTrace || []).filter(
        (t) => t.stage === 'enrichment' && t.status === 'error'
      ).length
      if (failedAttempts >= 3) {
        logger.info(`\x1b[33m  ⊙ Max retries - promoting:\x1b[0m "${article.headline?.substring(0, 50)}"`)
      } else {
        logger.info(`\x1b[33m  ↻ Retry (${failedAttempts + 1}/3):\x1b[0m "${article.headline?.substring(0, 50)}"`)
      }
      return failedAttempts < 3
    }
    return true
  })
  
  if (needsEnrichment.length === 0) {
    logger.info('▸ All articles already enriched. Skipping.')
    return { enrichedArticles: [], allProcessedArticles: [], enrichmentOutcomes: [] }
  }

  logger.info(`▸ Enriching ${needsEnrichment.length} articles (${enrichmentQueue.length - needsEnrichment.length} cached)...`)

  const limit = pLimit(env.CONCURRENCY_LIMIT)
  const processingPromises = needsEnrichment.map((article) =>
    limit(() => processSingleArticle(article, article.hits || []))
  )

  logger.info('  ⊙ Processing with AI (content extraction + assessment)...')
  const results = await Promise.all(processingPromises)

  const enrichedArticles = []
  const allProcessedArticles = []
  const enrichmentOutcomes = []

  const successCnt = results.filter(r => r.lifecycleEvent.status === 'success').length
  const headlineOnlyCnt = results.filter(r => r.lifecycleEvent.status === 'headline_only').length
  const errorCnt = results.filter(r => r.lifecycleEvent.status === 'error').length
  const droppedCnt = results.filter(r => r.lifecycleEvent.status === 'dropped').length
  
  logger.info('▸ ═══════════════════════════════════════════')
  logger.info('▸ ENRICHMENT RESULTS')
  logger.info('▸ ═══════════════════════════════════════════')
  logger.info(`\x1b[37m  ✓ Success: ${successCnt}\x1b[0m | \x1b[36m◉ Headline: ${headlineOnlyCnt}\x1b[0m | \x1b[90m⊝ Dropped: ${droppedCnt}\x1b[0m | \x1b[33m✗ Errors: ${errorCnt}\x1b[0m`)

  results.forEach((result, index) => {
    const originalArticle = needsEnrichment[index]
    const outcome = result.lifecycleEvent.status
    
    const newStatus = outcome === 'success' 
      ? 'pending_notification' 
      : outcome === 'headline_only'
        ? 'pending_notification'
        : outcome === 'error' 
          ? 'failed_enrichment' 
          : 'enriched'
    
    const updatedTrace = [...(originalArticle.pipelineTrace || []), result.lifecycleEvent]
    const finalArticleState = {
      ...originalArticle,
      ...(result.article || {}),
      status: newStatus,
      pipelineTrace: updatedTrace,
    }
    delete finalArticleState.articleContent
    allProcessedArticles.push(finalArticleState)

    articleTraceLogger.addStage(originalArticle._id, 'Content Enrichment', {
      outcome: result.lifecycleEvent.status,
      reason: result.lifecycleEvent.reason,
      raw_html_snippet: truncateString(result.rawHtml, 500),
      extracted_content: result.contentPreview,
      llm_assessment: result.article,
    })

    enrichmentOutcomes.push({
      link: finalArticleState.link,
      headline: finalArticleState.headline,
      newspaper: finalArticleState.newspaper,
      headlineScore: finalArticleState.relevance_headline,
      assessment_headline: finalArticleState.assessment_headline,
      finalScore: finalArticleState.relevance_article,
      assessment_article: finalArticleState.assessment_article,
      content_snippet: result.contentPreview,
      outcome: outcome,
      reason: result.lifecycleEvent.reason,
      extractionMethod: result.extractionMethod,
      extractionSelectors: result.extractionSelectors,
    })

    if (outcome === 'success') {
      enrichedArticles.push(finalArticleState)
      logger.info(`\x1b[37m  ✓\x1b[0m "${originalArticle.headline?.substring(0, 60)}"`)
      logger.info(`\x1b[37m    Head: ${originalArticle.relevance_headline} → Art: ${finalArticleState.relevance_article} | ${result.extractionMethod}\x1b[0m`)
    } else if (outcome === 'headline_only') {
      enrichedArticles.push(finalArticleState)
      logger.info(`\x1b[36m  ◉ Headline-only:\x1b[0m "${originalArticle.headline?.substring(0, 60)}"`)
      logger.info(`\x1b[36m    Head: ${originalArticle.relevance_headline} | No article content — using headline for synthesis\x1b[0m`)
    } else if (outcome === 'error') {
      logger.warn(`\x1b[31m  ✗ Error:\x1b[0m "${originalArticle.headline?.substring(0, 60)}"`)
      logger.warn(`\x1b[33m    Reason: ${result.lifecycleEvent.reason?.substring(0, 70)}\x1b[0m`)
    } else {
      logger.info(`\x1b[90m  ⊝ Dropped:\x1b[0m "${originalArticle.headline?.substring(0, 60)}"`)
      logger.info(`\x1b[90m    Reason: ${result.lifecycleEvent.reason?.substring(0, 70)}\x1b[0m`)
    }
  })

  if (allProcessedArticles.length > 0) {
    const bulkOps = allProcessedArticles.map((article) => ({
      updateOne: {
        filter: { link: article.link },
        update: { $set: article },
      },
    }))
    await bulkWriteArticles(bulkOps)
    logger.info(
      `Updated ${allProcessedArticles.length} enriched articles in the database.`
    )
  }

  logger.info(
    `Enrichment complete. Successfully enriched ${enrichedArticles.length} of ${enrichmentQueue.length} candidates.`
  )

  return { enrichedArticles, allProcessedArticles, enrichmentOutcomes }
}
