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
  const enrichmentQueue = [...relevantCandidates, ...syntheticArticles]
  logger.info(
    `Starting full enrichment for ${enrichmentQueue.length} articles (relevant + synthetic).`
  )

  if (enrichmentQueue.length === 0) {
    return { enrichedArticles: [], allProcessedArticles: [], enrichmentOutcomes: [] }
  }

  const limit = pLimit(env.CONCURRENCY_LIMIT)
  const processingPromises = enrichmentQueue.map((article) =>
    limit(() => processSingleArticle(article, article.hits || []))
  )

  const results = await Promise.all(processingPromises)

  const enrichedArticles = []
  const allProcessedArticles = []
  const enrichmentOutcomes = []

  logger.info('--- Full Article Enrichment Results ---')
  results.forEach((result, index) => {
    const originalArticle = enrichmentQueue[index]
    const updatedTrace = [...(originalArticle.pipelineTrace || []), result.lifecycleEvent]
    const finalArticleState = {
      ...originalArticle,
      ...(result.article || {}),
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

    const outcome = result.lifecycleEvent.status
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
      logger.info(
        `✅ [SUCCESS] "${truncateString(originalArticle.headline, 60)}" - Final Score: ${finalArticleState.relevance_article}`
      )
    } else {
      logger.warn(
        `❌ [${outcome.toUpperCase()}] "${truncateString(originalArticle.headline, 60)}" - Reason: ${result.lifecycleEvent.reason}`
      )
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
