// apps/pipeline/src/pipeline/2_scrapeAndFilter.js

import { logger } from '@headlines/utils-shared' // The universal, isomorphic logger
import { auditLogger } from '@headlines/utils-server' // The server-only, file-writing audit logger

// apps/pipeline/src/pipeline/2_scrapeAndFilter.js
import { filterFreshArticles } from '../modules/dataStore/index.js'
import { Source } from '@headlines/models'
import {
  scrapeSiteForHeadlines,
  scrapeArticleContent,
} from '@headlines/scraper-logic/scraper/index.js'
import mongoose from 'mongoose'
import { env, settings } from '@headlines/config'
import pLimit from 'p-limit'

async function performContentPreflight(source, articles) {
  if (!articles || articles.length === 0)
    return { success: false, reason: 'No headlines to test' }

  const firstArticle = {
    ...articles[0],
    source: source.name,
    newspaper: source.name,
    country: source.country,
  }
  const contentResult = await scrapeArticleContent(firstArticle, source)
  const content = contentResult.articleContent?.contents?.join('')

  if (!content || content.length < settings.MIN_ARTICLE_CHARS) {
    const reason = !content
      ? contentResult.enrichment_error
      : `Content too short (${content.length} < ${settings.MIN_ARTICLE_CHARS} chars).`
    logger.warn(`[Content Pre-flight] ❌ FAILED for "${source.name}". Reason: ${reason}`)
    return { success: false, reason }
  }

  logger.info(`✅ Content pre-flight check PASSED for "${source.name}".`)
  return { success: true }
}

async function performStandardScraping(sourcesToScrape) {
  if (sourcesToScrape.length === 0) {
    return { allArticles: [], scraperHealth: [] }
  }

  const limit = pLimit(env.CONCURRENCY_LIMIT || 3)
  logger.info(
    `Pipeline will now scrape ${sourcesToScrape.length} active standard sources.`
  )

  const allArticles = []
  const scraperHealth = []

  const promises = sourcesToScrape.map((source) =>
    limit(async () => {
      logger.info(`[Scraping] -> Starting scrape for "${source.name}"...`)
      const result = await scrapeSiteForHeadlines(source)
      const foundCount = result.resultCount !== undefined ? result.resultCount : 0
      logger.info(
        `[Scraping] <- Finished scrape for "${source.name}". Success: ${result.success}, Found: ${foundCount}`
      )

      const healthReport = {
        source: source.name,
        success: result.success && result.resultCount > 0,
        count: result.resultCount || 0,
        error: result.error,
      }
      scraperHealth.push(healthReport)

      if (healthReport.success) {
        const articlesWithMetadata = result.articles.map((a) => ({
          ...a,
          source: source.name,
          newspaper: source.name,
          country: source.country,
        }))
        allArticles.push(...articlesWithMetadata)
      } else {
        logger.warn(
          `[Scraping] ❌ FAILED for "${source.name}": ${result.error || 'Extracted 0 headlines.'}`
        )
      }
    })
  )

  await Promise.all(promises)
  return { allArticles, scraperHealth }
}

export async function runScrapeAndFilter(pipelinePayload) {
  logger.info('--- STAGE 2: SCRAPE & FILTER ---')
  const { runStatsManager } = pipelinePayload // CORRECTED: Use runStatsManager

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const baseQuery = {
    status: 'active',
    $or: [
      { scrapeFrequency: 'high' },
      { scrapeFrequency: 'low', lastScrapedAt: { $lt: twentyFourHoursAgo } },
      { scrapeFrequency: 'low', lastScrapedAt: { $exists: false } },
    ],
  }

  const queryCriteria = { ...baseQuery }

  if (pipelinePayload.countryFilter) {
    queryCriteria.country = new RegExp(`^${pipelinePayload.countryFilter}$`, 'i')
    delete queryCriteria.$or
  }
  if (pipelinePayload.sourceFilter) {
    queryCriteria.name = new RegExp(pipelinePayload.sourceFilter, 'i')
    delete queryCriteria.$or
  }

  const sourcesToScrape = await Source.find(queryCriteria).lean()
  if (sourcesToScrape.length === 0) {
    logger.warn(
      `No active sources found matching filter: ${JSON.stringify(queryCriteria)}. Ending run.`
    )
    return { success: true, payload: { ...pipelinePayload, articlesForPipeline: [] } }
  }

  const { allArticles, scraperHealth } = await performStandardScraping(sourcesToScrape)
  runStatsManager.set('scraperHealth', scraperHealth) // CORRECTED: Use manager method
  auditLogger.info(
    {
      context: {
        all_scraped_headlines: allArticles.map((a) => ({
          headline: a.headline,
          source: a.newspaper,
        })),
      },
    },
    'All Scraped Headlines'
  )

  const freshArticles = await filterFreshArticles(
    allArticles,
    pipelinePayload.isRefreshMode
  )
  auditLogger.info(
    { context: { fresh_headlines: freshArticles.map((a) => a.headline) } },
    'Fresh Headlines After Filtering'
  )

  const freshArticlesBySource = freshArticles.reduce((acc, article) => {
    if (!acc[article.source]) acc[article.source] = []
    acc[article.source].push(article)
    return acc
  }, {})

  const sourcesWithFreshContent = new Set(Object.keys(freshArticlesBySource))
  logger.info(
    `Found ${sourcesWithFreshContent.size} sources with fresh content that require a content pre-flight check.`
  )

  let validatedArticles = []
  const analyticsUpdateOps = []

  for (const sourceName of sourcesWithFreshContent) {
    const source = sourcesToScrape.find((s) => s.name === sourceName)
    const healthReport = scraperHealth.find((h) => h.source === sourceName)

    if (source && healthReport && healthReport.success) {
      const contentCheck = await performContentPreflight(
        source,
        freshArticlesBySource[sourceName]
      )
      if (contentCheck.success) {
        validatedArticles.push(...freshArticlesBySource[sourceName])
        analyticsUpdateOps.push({
          updateOne: {
            filter: { _id: source._id },
            update: { $set: { 'analytics.lastRunContentSuccess': true } },
          },
        })
      } else {
        analyticsUpdateOps.push({
          updateOne: {
            filter: { _id: source._id },
            update: { $set: { 'analytics.lastRunContentSuccess': false } },
          },
        })
      }
    }
  }

  if (analyticsUpdateOps.length > 0) {
    await Source.bulkWrite(analyticsUpdateOps)
  }

  runStatsManager.set('headlinesScraped', allArticles.length) // CORRECTED
  runStatsManager.set('validatedHeadlines', validatedArticles.length) // CORRECTED
  runStatsManager.set('freshHeadlinesFound', validatedArticles.length) // CORRECTED

  if (validatedArticles.length > 0) {
    pipelinePayload.articlesForPipeline = validatedArticles.map((article) => ({
      ...article,
      _id: new mongoose.Types.ObjectId(),
      status: 'scraped',
    }))
  } else {
    logger.info('No new, validated articles to process. Ending run early.')
    pipelinePayload.articlesForPipeline = []
  }

  return { success: true, payload: pipelinePayload }
}