// apps/pipeline/src/pipeline/3_assessAndEnrich.js
import { logger } from '@headlines/utils-shared'
import { settings } from '@headlines/config/node'
import { assessHeadlines } from './submodules/assessHeadlines.js'
import { enrichArticles } from './submodules/enrichArticles.js'
import { findArticles } from '@headlines/data-access'

export async function runAssessAndEnrich(pipelinePayload) {
  logger.info('--- STAGE 3: ASSESS & ENRICH ---')
  const {
    runStatsManager,
    articleTraceLogger,
    isRefreshMode,
    lean: isLeanMode,
    articlesForPipeline, // Use the data passed from the previous stage
  } = pipelinePayload

  if (!articlesForPipeline || articlesForPipeline.length === 0) {
    logger.info(
      'No articles found to assess and enrich for the current filter. Skipping stage.'
    )
    pipelinePayload.enrichedArticles = []
    pipelinePayload.assessedCandidates = []
    return { success: true, payload: pipelinePayload }
  }

  logger.info(`Found ${articlesForPipeline.length} articles to assess and enrich.`)

  const syntheticArticles = articlesForPipeline.filter(
    (a) => a.source === 'Richlist Ingestion' || a.source === 'Test E2E Source'
  )
  const realArticles = articlesForPipeline.filter(
    (a) => a.source !== 'Richlist Ingestion' && a.source !== 'Test E2E Source'
  )

  let assessedCandidates = []
  if (isRefreshMode) {
    logger.info(
      'REFRESH MODE: Skipping headline assessment as articles are already assessed.'
    )
    assessedCandidates = realArticles
  } else {
    assessedCandidates = await assessHeadlines(realArticles, articleTraceLogger)
  }

  runStatsManager.set('headlinesAssessed', assessedCandidates.length)

  assessedCandidates.forEach((article) => {
    const status =
      article.relevance_headline >= settings.HEADLINES_RELEVANCE_THRESHOLD
        ? 'PASSED'
        : 'DROPPED'
    const color = status === 'PASSED' ? '\x1b[32m' : '\x1b[90m'
    logger.info(
      `${color}[${status.padEnd(7)}] [Score: ${String(
        article.relevance_headline
      ).padStart(3)}] "${article.headline}"\x1b[0m`
    )
  })

  if (assessedCandidates.length > 0 && !isRefreshMode) {
    const assessedLinks = assessedCandidates.map((a) => a.link)
    const refetchResult = await findArticles({
      filter: { link: { $in: assessedLinks } },
      select: '+articleContent',
    })
    if (refetchResult.success && refetchResult.data.length > 0) {
      logger.info(
        `Synchronized state for ${refetchResult.data.length} assessed articles from the database to ensure data integrity.`
      )
      assessedCandidates = refetchResult.data
    } else {
      logger.error(
        { err: refetchResult.error },
        'CRITICAL: Failed to re-fetch assessed articles after saving. The pipeline cannot safely proceed.'
      )
      throw new Error(
        'Failed to synchronize article state from database after assessment.'
      )
    }
  }

  let relevantCandidates = assessedCandidates.filter(
    (a) => a.relevance_headline >= settings.HEADLINES_RELEVANCE_THRESHOLD
  )
  runStatsManager.set('relevantHeadlines', relevantCandidates.length)

  if (isLeanMode && relevantCandidates.length > 0) {
    logger.warn(
      `[LEAN MODE] Pre-selecting top 5 candidates for enrichment to find one champion.`
    )
    relevantCandidates.sort((a, b) => b.relevance_headline - a.relevance_headline)
    const topCandidates = relevantCandidates.slice(0, 5)

    const { enrichedArticles: leanEnriched, enrichmentOutcomes } = await enrichArticles(
      topCandidates,
      syntheticArticles,
      articleTraceLogger
    )

    runStatsManager.set('enrichmentOutcomes', enrichmentOutcomes)

    if (leanEnriched.length > 0) {
      const championArticle = leanEnriched.reduce((max, current) =>
        (current.relevance_article || 0) > (max.relevance_article || 0) ? current : max
      )
      pipelinePayload.enrichedArticles = [championArticle]
      logger.warn(
        `[LEAN MODE] Champion selected with final score ${championArticle.relevance_article}: "${championArticle.headline}"`
      )
    } else {
      pipelinePayload.enrichedArticles = []
      logger.warn('[LEAN MODE] No articles survived enrichment to become champion.')
    }
    pipelinePayload.assessedCandidates = assessedCandidates
    return { success: true, payload: pipelinePayload }
  }

  const { enrichedArticles, enrichmentOutcomes } = await enrichArticles(
    relevantCandidates,
    syntheticArticles,
    articleTraceLogger
  )

  runStatsManager.set('enrichmentOutcomes', enrichmentOutcomes)
  runStatsManager.set('articlesEnriched', enrichedArticles.length)
  runStatsManager.set('relevantArticles', enrichedArticles.length)

  pipelinePayload.enrichedArticles = enrichedArticles
  pipelinePayload.assessedCandidates = assessedCandidates

  return { success: true, payload: pipelinePayload }
}
