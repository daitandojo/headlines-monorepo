// packages/scraper-logic/src/scraper/orchestrator.js (version 5.0.0)
import pLimit from 'p-limit'
import { sleep } from '@headlines/utils'
import { getConfig } from '../config.js'
import { scrapeSiteForHeadlines } from './headlineScraper.js'
// NEWSAPI REWORK: The direct import of scrapeNewsAPI is removed as it's no longer used for proactive scraping.
// import { scrapeNewsAPI } from './newsApiScraper.js'
import { updateSourceAnalyticsBatch } from '../../../data-access/src/index.js'
import { env } from '../../../config/src/index.js'

async function performStandardScraping(sourcesToScrape) {
  if (sourcesToScrape.length === 0) {
    return { scrapedArticles: [], scraperHealth: [] }
  }

  const limit = pLimit(env.CONCURRENCY_LIMIT || 3)
  getConfig().logger.info(
    `Pipeline will now scrape ${sourcesToScrape.length} active standard sources.`
  )

  let allArticles = []
  const scraperHealthMap = new Map()

  const promises = sourcesToScrape.map((source) =>
    limit(async () => {
      getConfig().logger.info(`[Scraping] -> Starting scrape for "${source.name}"...`)
      const result = await scrapeSiteForHeadlines(source)
      const foundCount = result.resultCount !== undefined ? result.resultCount : 0
      getConfig().logger.info(
        `[Scraping] <- Finished scrape for "${source.name}". Success: ${result.success}, Found: ${foundCount}`
      )
      return { source, result }
    })
  )
  const results = await Promise.all(promises)

  const bulkUpdateOps = []

  for (const { source, result } of results) {
    const healthReport = {
      source: source.name,
      success: result.success && result.resultCount > 0,
      count: result.resultCount || 0,
      error: result.error,
      debugHtml: result.debugHtml,
      failedSelector: result.success ? null : source.headlineSelector,
    }
    scraperHealthMap.set(source.name, healthReport)

    if (healthReport.success) {
      allArticles.push(
        ...result.articles.map((a) => ({
          ...a,
          source: source.name,
          newspaper: source.name,
          country: source.country,
        }))
      )
      bulkUpdateOps.push({
        updateOne: {
          filter: { _id: source._id },
          update: { $set: { lastScrapedAt: new Date(), lastSuccessAt: new Date() } },
        },
      })
    } else {
      getConfig().logger.warn(
        `[Scraping] ❌ FAILED for "${source.name}": ${result.error || 'Extracted 0 headlines.'}.`
      )
      bulkUpdateOps.push({
        updateOne: {
          filter: { _id: source._id },
          update: { $set: { lastScrapedAt: new Date() } },
        },
      })
    }
  }

  if (bulkUpdateOps.length > 0) {
    await updateSourceAnalyticsBatch(bulkUpdateOps)
  }

  return {
    scrapedArticles: allArticles,
    scraperHealth: Array.from(scraperHealthMap.values()),
  }
}

// NEWSAPI REWORK: The main orchestrator is simplified. It no longer calls scrapeNewsAPI.
// Its sole responsibility is now to manage the standard scraping process. This aligns
// with the new strategy of using external APIs only for enrichment, not discovery.
export async function scrapeAllHeadlines(sourcesToScrape) {
  const { scrapedArticles, scraperHealth } =
    await performStandardScraping(sourcesToScrape)

  const uniqueArticles = Array.from(
    new Map(scrapedArticles.map((a) => [a.link, a])).values()
  )

  getConfig().logger.info(
    `Scraping complete. Found ${uniqueArticles.length} unique articles from standard sources.`
  )

  return { allArticles: uniqueArticles, scraperHealth }
}
