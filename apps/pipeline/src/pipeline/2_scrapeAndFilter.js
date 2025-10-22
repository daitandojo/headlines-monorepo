// apps/pipeline/src/pipeline/2_scrapeAndFilter.js
import { logger } from '@headlines/utils-shared'
import { auditLogger } from '../utils/auditLogger.js'
import { filterFreshArticles } from '../modules/dataStore/index.js'
import { Source, Article, SynthesizedEvent, RunVerdict } from '@headlines/models'
import { performStandardScraping } from '../scraper/standardScraper.js'
import mongoose from 'mongoose'
import { settings } from '@headlines/config'
import colors from 'ansi-colors'
import { findArticles, bulkWriteArticles } from '@headlines/data-access'

export async function runScrapeAndFilter(pipelinePayload) {
  logger.info('--- STAGE 2: SCRAPE & FILTER ---')
  const { runStatsManager, isRefreshMode, sourcesToScrape } = pipelinePayload

  if (isRefreshMode) {
    logger.warn(
      'REFRESH MODE: Bypassing scraping. Finding and resetting relevant articles from the last 24 hours.'
    )
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const filter = {
      createdAt: { $gte: cutoffDate },
      relevance_headline: { $gte: settings.HEADLINES_RELEVANCE_THRESHOLD },
      synthesizedEventId: { $exists: false },
    }
    const articlesResult = await findArticles({ filter, select: '+articleContent' })
    if (!articlesResult.success) {
      throw new Error(`Failed to fetch articles for refresh: ${articlesResult.error}`)
    }
    const articlesToReprocess = articlesResult.data
    const articleIdsToReset = articlesToReprocess.map((a) => a._id)
    if (articlesToReprocess.length === 0) {
      logger.info('✅ No relevant articles found to refresh. Ending run.')
      pipelinePayload.articlesForPipeline = []
      return { success: true, payload: pipelinePayload }
    }
    logger.info(
      colors.yellow(
        `Found ${articlesToReprocess.length} relevant articles to refresh and re-process.`
      )
    )
    const eventsToDelete = await SynthesizedEvent.find({
      'source_articles.link': { $in: articlesToReprocess.map((a) => a.link) },
    }).select('_id')
    const eventIdsToDelete = eventsToDelete.map((e) => e._id)
    const [eventDeletion, verdictDeletion] = await Promise.all([
      eventIdsToDelete.length > 0
        ? SynthesizedEvent.deleteMany({ _id: { $in: eventIdsToDelete } })
        : { deletedCount: 0 },
      RunVerdict.deleteMany({ createdAt: { $gte: cutoffDate } }),
    ])
    logger.info(
      `Targeted Cleanup: Deleted ${eventDeletion.deletedCount} associated events and ${verdictDeletion.deletedCount} run verdicts.`
    )
    await Article.updateMany(
      { _id: { $in: articleIdsToReset } },
      {
        $set: { status: 'scraped' },
        $unset: {
          relevance_article: '',
          assessment_article: '',
          key_individuals: '',
          transactionType: '',
          tags: '',
          synthesizedEventId: '',
        },
      }
    )
    logger.info(`Reset ${articleIdsToReset.length} articles to 'scraped' status.`)
    // Correctly populate the payload for the next stage in refresh mode
    pipelinePayload.articlesForPipeline = articlesToReprocess
    return { success: true, payload: pipelinePayload }
  }

  if (sourcesToScrape.length === 0) {
    logger.warn(
      'No active sources to scrape were passed from pre-flight stage. Ending run.'
    )
    return { success: true, payload: pipelinePayload }
  }

  const { scrapedArticles, scraperHealth } =
    await performStandardScraping(sourcesToScrape)

  runStatsManager.set('scraperHealth', scraperHealth)
  runStatsManager.set('headlinesScraped', scrapedArticles.length)
  auditLogger.info(
    {
      context: {
        all_scraped_headlines: scrapedArticles.map((a) => ({
          headline: a.headline,
          source: a.newspaper,
        })),
      },
    },
    'All Scraped Headlines'
  )

  const freshArticles = await filterFreshArticles(scrapedArticles, false)
  auditLogger.info(
    { context: { fresh_headlines: freshArticles.map((a) => a.headline) } },
    'Fresh Headlines After Filtering'
  )

  runStatsManager.set('freshHeadlinesFound', freshArticles.length)

  if (freshArticles.length > 0) {
    const articlesToSave = freshArticles.map((article) => ({
      ...article,
      _id: new mongoose.Types.ObjectId(),
      status: 'scraped',
    }))

    const bulkOps = articlesToSave.map((article) => ({
      updateOne: {
        filter: { link: article.link },
        update: { $setOnInsert: article },
        upsert: true,
      },
    }))

    const result = await bulkWriteArticles(bulkOps)
    if (!result.success) {
      throw new Error(`Failed to save fresh articles: ${result.error}`)
    }
    logger.info(
      `Successfully saved ${result.result.upsertedCount} new articles to the database with status 'scraped'.`
    )
    // Pass the newly saved, full article objects to the next stage
    pipelinePayload.articlesForPipeline = articlesToSave
  } else {
    logger.info('No new articles to process. Ending run early.')
    pipelinePayload.articlesForPipeline = []
  }

  return { success: true, payload: pipelinePayload }
}
