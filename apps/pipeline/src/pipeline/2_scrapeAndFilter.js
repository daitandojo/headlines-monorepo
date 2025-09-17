// apps/pipeline/src/pipeline/2_scrapeAndFilter.js (version 9.0.0)
import { logger, auditLogger } from '@headlines/utils/src/server.js';
import { filterFreshArticles } from '../modules/dataStore/index.js';
import { triggerSelectorRepair } from './submodules/triggerSelectorRepair.js';
import { Source, Article } from '@headlines/models/src/index.js';
import { scrapeAllHeadlines } from '@headlines/scraper-logic/src/scraper/orchestrator.js';
import { scrapeArticleContent } from '@headlines/scraper-logic/src/scraper/index.js';
import mongoose from 'mongoose';
import { settings } from '@headlines/config/src/server.js';

async function performContentPreflight(source, articles) {
    if (!articles || articles.length === 0) return { success: false, reason: 'No headlines to test' };
    
    const firstArticle = { ...articles[0], source: source.name, newspaper: source.name, country: source.country };
    const contentResult = await scrapeArticleContent(firstArticle, source);
    const content = contentResult.articleContent?.contents?.join('');

    if (!content || content.length < settings.MIN_ARTICLE_CHARS) {
        const reason = !content ? contentResult.enrichment_error : `Content too short (${content.length} < ${settings.MIN_ARTICLE_CHARS} chars).`;
        logger.warn(`[Content Pre-flight] ❌ FAILED for "${source.name}". Reason: ${reason}`);
        return { success: false, reason };
    }
    
    logger.info(`✅ Content pre-flight check PASSED for "${source.name}".`);
    return { success: true };
}

export async function runScrapeAndFilter(pipelinePayload) {
  logger.info('--- STAGE 2: SCRAPE & FILTER ---');
  const { runStats } = pipelinePayload;

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const baseQuery = {
    status: 'active',
    $or: [
      { scrapeFrequency: 'high' },
      { scrapeFrequency: 'low', lastScrapedAt: { $lt: twentyFourHoursAgo } },
      { scrapeFrequency: 'low', lastScrapedAt: { $exists: false } }
    ]
  };
  
  const queryCriteria = { ...baseQuery };

  if (pipelinePayload.countryFilter) {
      queryCriteria.country = new RegExp(`^${pipelinePayload.countryFilter}$`, 'i');
      delete queryCriteria.$or;
  }
  if (pipelinePayload.sourceFilter) {
      queryCriteria.name = new RegExp(`^${pipelinePayload.sourceFilter}$`, 'i');
      delete queryCriteria.$or;
  }

  const sourcesToScrape = await Source.find(queryCriteria).lean();
  if (sourcesToScrape.length === 0) {
    logger.warn(`No active sources found matching filter: ${JSON.stringify(queryCriteria)}. Ending run.`);
    return { success: true, payload: { ...pipelinePayload, articlesForPipeline: [] } };
  }
  
  const { allArticles, scraperHealth } = await scrapeAllHeadlines(sourcesToScrape);
  runStats.scraperHealth = scraperHealth;
  auditLogger.info({ context: { all_scraped_headlines: allArticles.map(a => ({ headline: a.headline, source: a.newspaper })) } }, 'All Scraped Headlines');
  
  const freshArticles = await filterFreshArticles(allArticles, pipelinePayload.isRefreshMode);
  auditLogger.info({ context: { fresh_headlines: freshArticles.map(a => a.headline) } }, 'Fresh Headlines After Filtering');
  
  const freshArticlesBySource = freshArticles.reduce((acc, article) => {
    if (!acc[article.source]) acc[article.source] = [];
    acc[article.source].push(article);
    return acc;
  }, {});

  const sourcesWithFreshContent = new Set(Object.keys(freshArticlesBySource));
  logger.info(`Found ${sourcesWithFreshContent.size} sources with fresh content that require a content pre-flight check.`);

  let validatedArticles = [];
  const analyticsUpdateOps = [];

  for (const sourceName of sourcesWithFreshContent) {
    const source = sourcesToScrape.find(s => s.name === sourceName);
    const healthReport = scraperHealth.find(h => h.source === sourceName);

    if (source && healthReport && healthReport.success) {
      const contentCheck = await performContentPreflight(source, freshArticlesBySource[sourceName]);
      if (contentCheck.success) {
        validatedArticles.push(...freshArticlesBySource[sourceName]);
        analyticsUpdateOps.push({ updateOne: { filter: { _id: source._id }, update: { $set: { 'analytics.lastRunContentSuccess': true } } } });
      } else {
        analyticsUpdateOps.push({ updateOne: { filter: { _id: source._id }, update: { $set: { 'analytics.lastRunContentSuccess': false } } } });
      }
    }
  }

  if (analyticsUpdateOps.length > 0) {
      await Source.bulkWrite(analyticsUpdateOps);
  }

  runStats.headlinesScraped = allArticles.length;
  runStats.validatedHeadlines = validatedArticles.length; 

  const articlesWithIds = validatedArticles.map(article => ({ ...article, _id: article._id || new mongoose.Types.ObjectId(), status: 'scraped' }));
  runStats.freshHeadlinesFound = articlesWithIds.length;

  if (articlesWithIds.length > 0) {
    await Article.insertMany(articlesWithIds, { ordered: false }).catch(err => {
      if (err.code !== 11000) logger.error({ err }, "Error inserting scraped articles");
    });
    logger.info(`Successfully saved ${articlesWithIds.length} fresh & validated articles to the database.`);
  } else {
    logger.info('No new, validated articles to process. Ending run early.');
    pipelinePayload.articlesForPipeline = [];
    return { success: true, payload: pipelinePayload };
  }
  
  pipelinePayload.articlesForPipeline = articlesWithIds;
  return { success: true, payload: pipelinePayload };
}
