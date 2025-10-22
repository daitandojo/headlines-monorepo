// apps/pipeline/src/pipeline/submodules/assessHeadlines.js
import { logger } from '@headlines/utils-shared'
import { auditLogger } from '../../utils/auditLogger.js'
import { settings } from '@headlines/config'
import { WatchlistEntity } from '@headlines/models'
import { bulkWriteArticles } from '@headlines/data-access'
import { batchHeadlineChain, headlineChain } from '@headlines/ai-services'
import { sleep } from '@headlines/utils-shared'

const BATCH_SIZE = 8
const MAX_RETRIES = 1
const HIGH_SIGNAL_KEYWORDS = [
  'konkurs',
  'bankruptcy',
  'succession',
  'grundlægger',
  'founder',
  'sælger',
  'sells',
  'opkøber',
  'acquires',
]

async function withRetry(fn, retries = MAX_RETRIES) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === retries) throw error
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
      !entity.country || entity.country === country || entity.country === 'Global PE'
  )
  for (const entity of relevantEntities) {
    if (!entity || !entity.name) continue
    const terms = [entity.name.toLowerCase(), ...(entity.searchTerms || [])]
      .map((t) => t.trim())
      .filter(Boolean)
    for (const term of terms) {
      if (term.length > 3 && createSearchRegex(term).test(lowerText)) {
        if (!hits.has(entity.name)) hits.set(entity.name, { entity, matchedTerm: term })
      }
    }
  }
  return Array.from(hits.values()).filter(Boolean)
}

export async function assessHeadlines(articles, articleTraceLogger) {
  if (!articles || articles.length === 0) return []

  const watchlistEntities = await WatchlistEntity.find({ status: 'active' }).lean()
  const assessedCandidatesMap = new Map()
  const failedArticles = []

  logger.info(`Assessing ${articles.length} headlines in batches of ${BATCH_SIZE}...`)
  const batches = []
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    batches.push(articles.slice(i, i + BATCH_SIZE))
  }

  for (const [index, batch] of batches.entries()) {
    logger.info(`Assessing batch ${index + 1} of ${batches.length}...`)
    try {
      const batchWithContext = batch.map((article) => {
        const hits = findWatchlistHits(
          article.headline,
          article.country,
          watchlistEntities
        )
        const watchlistHits = hits.map((h) => h.entity._id)
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
        return { ...article, headlineWithContext, hits, watchlistHits }
      })

      const response = await batchHeadlineChain({
        headlines_json_string: JSON.stringify(
          batchWithContext.map((a) => ({
            id: a._id.toString(),
            headline: a.headlineWithContext,
          }))
        ),
      })

      if (response.error || !response.assessments) {
        throw new Error(
          response.error || 'Batch assessment returned no assessments array.'
        )
      }

      const assessmentMap = new Map(
        response.assessments.map((assessment) => [assessment.id, assessment])
      )

      batchWithContext.forEach((originalArticle) => {
        const assessment = assessmentMap.get(originalArticle._id.toString())
        if (assessment) {
          if (originalArticle.hits.length > 0) {
            let score = assessment.relevance_headline
            const hitNames = originalArticle.hits.map((h) => h.entity.name).join(', ')
            score = Math.min(100, score + settings.WATCHLIST_SCORE_BOOST)
            assessment.assessment_headline = `Watchlist boost (+${settings.WATCHLIST_SCORE_BOOST} for "${hitNames}"). ${assessment.assessment_headline}`
            assessment.relevance_headline = score
          }
          // --- START OF HARDENING ---
          // Ensure score is always a number to prevent `undefined` in logs/DB
          if (
            assessment.relevance_headline === null ||
            assessment.relevance_headline === undefined
          ) {
            logger.warn(
              { assessment },
              'AI returned null/undefined for relevance_headline. Defaulting to 0.'
            )
            assessment.relevance_headline = 0
          }
          // --- END OF HARDENING ---
          assessedCandidatesMap.set(originalArticle.link, {
            ...originalArticle,
            ...assessment,
          })
        } else {
          logger.warn(
            { article: originalArticle.headline },
            'Article was dropped from batch response by AI. Queuing for single-assessment fallback.'
          )
          failedArticles.push(originalArticle)
        }
      })
    } catch (batchError) {
      logger.error(
        { err: batchError },
        `Batch ${index + 1} failed. FALLING BACK to single-article assessment for this entire batch.`
      )
      failedArticles.push(...batch)
    }
  }

  if (failedArticles.length > 0) {
    logger.info(
      `--- Running single-assessment fallback for ${failedArticles.length} failed articles... ---`
    )
    const fallbackPromises = failedArticles.map(async (article) => {
      try {
        const hits = findWatchlistHits(
          article.headline,
          article.country,
          watchlistEntities
        )
        const watchlistHits = hits.map((h) => h.entity._id)
        const singleAssessment = await headlineChain({ article, hits })
        return { ...article, ...singleAssessment, hits, watchlistHits }
      } catch (singleError) {
        logger.error(
          { err: singleError, article: article.headline },
          'Single article assessment fallback also failed.'
        )
        return {
          ...article,
          relevance_headline: 0,
          assessment_headline: 'Assessment failed completely.',
          hits: [],
          watchlistHits: [],
        }
      }
    })

    const fallbackResults = await Promise.all(fallbackPromises)
    fallbackResults.forEach((res) => assessedCandidatesMap.set(res.link, res))
  }

  const candidatesForSecondPass = []
  const headlineThreshold = settings.HEADLINES_RELEVANCE_THRESHOLD
  const lowerCaseKeywords = HIGH_SIGNAL_KEYWORDS.map((k) => k.toLowerCase())

  for (const article of assessedCandidatesMap.values()) {
    if (article.relevance_headline < headlineThreshold) {
      const lowerHeadline = article.headline.toLowerCase()
      const hasWatchlistHit = (article.hits || []).length > 0
      const hasKeyword = lowerCaseKeywords.some((keyword) =>
        lowerHeadline.includes(keyword)
      )

      if (hasWatchlistHit || hasKeyword) {
        candidatesForSecondPass.push(article)
      }
    }
  }

  if (candidatesForSecondPass.length > 0) {
    logger.info(
      `--- Re-assessing ${candidatesForSecondPass.length} ambiguous/high-signal headlines individually... ---`
    )

    const reassessmentPromises = candidatesForSecondPass.map(async (article) => {
      try {
        const reassessment = await headlineChain({ article, hits: article.hits })
        logger.info(
          `[RE-ASSESSMENT] "${article.headline.substring(0, 50)}..." | Original Score: ${article.relevance_headline} -> New Score: ${reassessment.relevance_headline}`
        )
        assessedCandidatesMap.set(article.link, { ...article, ...reassessment })
      } catch (singleError) {
        logger.error(
          { err: singleError, article: article.headline },
          'Single article re-assessment failed.'
        )
      }
    })
    await Promise.all(reassessmentPromises)
  }

  const assessedCandidates = Array.from(assessedCandidatesMap.values())

  logger.info('--- Headline Assessment Complete ---')

  if (assessedCandidates.length > 0) {
    const bulkOps = assessedCandidates.map((article) => ({
      updateOne: {
        filter: { link: article.link },
        update: {
          $setOnInsert: {
            _id: article._id,
            headline: article.headline,
            newspaper: article.newspaper,
            country: article.country,
            source: article.source,
          },
          $set: {
            status: 'assessed',
            relevance_headline: article.relevance_headline,
            assessment_headline: article.assessment_headline,
            headline_en: article.headline_en,
            watchlistHits:
              article.watchlistHits || (article.hits || []).map((h) => h.entity._id),
            pipelineTrace: [
              {
                stage: 'Headline Assessment',
                status:
                  article.relevance_headline >= settings.HEADLINES_RELEVANCE_THRESHOLD
                    ? 'PASSED'
                    : 'DROPPED',
                reason: article.assessment_headline,
              },
            ],
          },
        },
        upsert: true,
      },
    }))
    await bulkWriteArticles(bulkOps)
    logger.info(
      `Persisted ${assessedCandidates.length} assessed articles to prevent re-scraping.`
    )
  }

  assessedCandidates.forEach((article) => {
    articleTraceLogger.startTrace(article)
    articleTraceLogger.addStage(article._id, 'Headline Assessment', {
      score: article.relevance_headline,
      assessment: article.assessment_headline,
      hits: (article.hits || []).map((h) => h.entity.name),
    })
  })

  return assessedCandidates
}
