// apps/pipeline/src/pipeline/3_assessAndEnrich.js
import { logger } from '@headlines/utils-shared'
import { settings } from '@headlines/config/node'
import { assessHeadlines } from './submodules/assessHeadlines.js'
import { enrichArticles } from './submodules/enrichArticles.js'
import { findArticles } from '@headlines/data-access'
import { detectPreDealSignals } from '../modules/dealTracker/index.js'

export async function runAssessAndEnrich(pipelinePayload) {
  logger.info('═══════════════════════════════════════════════════════════════')
  logger.info(' STAGE 3: HEADLINE ASSESSMENT & ARTICLE ENRICHMENT')
  logger.info('═══════════════════════════════════════════════════════════════')
  const {
    runStatsManager,
    articleTraceLogger,
    lean: isLeanMode,
    articlesForPipeline,
  } = pipelinePayload

  if (!articlesForPipeline || articlesForPipeline.length === 0) {
    logger.warn('▸ No articles found for assessment. Stage skipped.')
    pipelinePayload.enrichedArticles = []
    pipelinePayload.assessedCandidates = []
    return { success: true, payload: pipelinePayload }
  }

  const synDocs = articlesForPipeline.filter(
    (a) => a.source === 'Richlist Ingestion' || a.source === 'Test E2E Source'
  )
  const realArticles = articlesForPipeline.filter(
    (a) => a.source !== 'Richlist Ingestion' && a.source !== 'Test E2E Source'
  )

  logger.info(`▸ Total candidates: ${articlesForPipeline.length} | Real: ${realArticles.length} | Synthetic: ${synDocs.length}`)

  let assessedCandidates = []
  const needsAssessment = realArticles.filter((a) => !a.relevance_headline)
  const alreadyAssessed = realArticles.filter((a) => a.relevance_headline)

  if (alreadyAssessed.length > 0) {
    logger.info(`▸ Skipping ${alreadyAssessed.length} already assessed (relevance_headline exists)`)
  }

  if (needsAssessment.length === 0) {
    logger.info('▸ All real articles already have headline scores. Using cached values.')
    assessedCandidates = realArticles
  } else {
    logger.info(`▸ Running AI headline assessment on ${needsAssessment.length} articles...`)
    assessedCandidates = await assessHeadlines(needsAssessment, articleTraceLogger)
    if (assessedCandidates.length > 0 && alreadyAssessed.length > 0) {
      assessedCandidates = [...alreadyAssessed, ...assessedCandidates]
    }
  }

  runStatsManager.set('headlinesAssessed', assessedCandidates.length)

  runStatsManager.set('headlinesAssessed', assessedCandidates.length)

  const passedCount = assessedCandidates.filter(a => a.relevance_headline >= settings.HEADLINES_RELEVANCE_THRESHOLD).length
  const droppedCount = assessedCandidates.length - passedCount
  logger.info('─────────────────────────────────────────────────────────')
  logger.info(' HEADLINE ASSESSMENT RESULTS')
  logger.info('─────────────────────────────────────────────────────────')
  logger.info(`▸ Total assessed: ${assessedCandidates.length}`)
  logger.info(`\x1b[32m▸ Passed (≥${settings.HEADLINES_RELEVANCE_THRESHOLD}): ${passedCount}\x1b[0m`)
  logger.info(`\x1b[90m▸ Dropped (<${settings.HEADLINES_RELEVANCE_THRESHOLD}): ${droppedCount}\x1b[0m`)
  logger.info('─────────────────────────────────────────────────────────')

  assessedCandidates.forEach((article) => {
    const passed = article.relevance_headline >= settings.HEADLINES_RELEVANCE_THRESHOLD
    const status = passed ? '✓ PASS' : '⊝ DROP'
    const color = passed ? '\x1b[37m' : '\x1b[90m'
    const reason = article.assessment_headline?.substring(0, 60) || 'N/A'
    const method = article.scrapeMethod || article._scrapeMethod || '?'
    logger.info(`${color}${status} [${String(article.relevance_headline).padStart(3)}] "${article.headline?.substring(0, 70)}"\x1b[0m`)
    logger.info(`${color}        Reason: ${reason}... | Method: ${method}\x1b[0m`)
  })

  if (assessedCandidates.length > 0) {
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

  // Pre-deal signal detection on low-scoring headlines (signal hunting)
  const lowScoring = assessedCandidates.filter(
    (a) => a.relevance_headline < settings.HEADLINES_RELEVANCE_THRESHOLD && a.relevance_headline >= 20
  )
  const preDealSignals = []
  for (const article of lowScoring) {
    const signals = detectPreDealSignals(article.headline, article.articleContent?.contents?.join(' '))
    if (signals.length > 0) {
      preDealSignals.push({ link: article.link, headline: article.headline, signals })
      logger.info(`\x1b[33m[PreDealSignal] ${article.headline?.substring(0, 60)}\x1b[0m`)
      signals.forEach(s => logger.info(`\x1b[33m  → ${s.signal}\x1b[0m`))
    }
  }
  runStatsManager.set('preDealSignals', preDealSignals)

  logger.info('─────────────────────────────────────────────────────────')
  logger.info(' ARTICLE ENRICHMENT PHASE')
  logger.info('─────────────────────────────────────────────────────────')
  logger.info(`▸ Articles passing headline threshold: ${relevantCandidates.length}`)

  if (isLeanMode && relevantCandidates.length > 0) {
    logger.info('▸ LEAN MODE: Selecting top 5 for enrichment to find champion...')
    relevantCandidates.sort((a, b) => b.relevance_headline - a.relevance_headline)
    const topCandidates = relevantCandidates.slice(0, 5)

    const { enrichedArticles: leanEnriched, enrichmentOutcomes } = await enrichArticles(
      topCandidates,
      synDocs,
      articleTraceLogger
    )

    runStatsManager.set('enrichmentOutcomes', enrichmentOutcomes)

    if (leanEnriched.length > 0) {
      const championArticle = leanEnriched.reduce((max, current) =>
        (current.relevance_article || 0) > (max.relevance_article || 0) ? current : max
      )
      pipelinePayload.enrichedArticles = [championArticle]
      logger.info(`▸ CHAMPION: Score ${championArticle.relevance_article} | "${championArticle.headline?.substring(0, 60)}"`)
    } else {
      pipelinePayload.enrichedArticles = []
      logger.warn('▸ No articles survived enrichment in LEAN MODE')
    }
    pipelinePayload.assessedCandidates = assessedCandidates
    return { success: true, payload: pipelinePayload }
  }

  const { enrichedArticles, enrichmentOutcomes } = await enrichArticles(
    relevantCandidates,
    synDocs,
    articleTraceLogger
  )

  runStatsManager.set('enrichmentOutcomes', enrichmentOutcomes)
  runStatsManager.set('articlesEnriched', enrichedArticles.length)
  runStatsManager.set('relevantArticles', enrichedArticles.length)

  const successRate = relevantCandidates.length > 0 
    ? Math.round((enrichedArticles.length / relevantCandidates.length) * 100) 
    : 0
  logger.info('─────────────────────────────────────────────────────────')
  logger.info(' ENRICHMENT RESULTS')
  logger.info('─────────────────────────────────────────────────────────')
  logger.info(`▸ Submitted: ${relevantCandidates.length}`)
  logger.info(`\x1b[37m▸ Successful: ${enrichedArticles.length} (${successRate}%)\x1b[0m`)
  
  if (enrichedArticles.length > 0) {
    enrichedArticles.forEach(article => {
      logger.info(`\x1b[37m▸ [${String(article.relevance_article || 0).padStart(3)}] "${article.headline?.substring(0, 70)}"\x1b[0m`)
      logger.info(`\x1b[37m          ${article.assessment_article?.substring(0, 80)}...\x1b[0m`)
    })
  }
  
  if (enrichmentOutcomes?.length > 0) {
    const failures = enrichmentOutcomes.filter(o => o.outcome === 'error')
    if (failures.length > 0) {
      logger.warn(`\x1b[33m▸ Errors requiring attention: ${failures.length}\x1b[0m`)
      failures.forEach(f => {
        logger.warn(`\x1b[33m    - "${f.headline?.substring(0, 50)}"\x1b[0m`)
        logger.warn(`\x1b[33m      ${f.reason?.substring(0, 50)}\x1b[0m`)
      })
    }
  }
  logger.info('─────────────────────────────────────────────────────────')

  pipelinePayload.enrichedArticles = enrichedArticles
  pipelinePayload.assessedCandidates = assessedCandidates

  return { success: true, payload: pipelinePayload }
}
