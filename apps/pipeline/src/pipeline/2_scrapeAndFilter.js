// apps/pipeline/src/pipeline/2_scrapeAndFilter.js
import { logger } from "@headlines/utils-shared";
import { auditLogger } from "../utils/auditLogger.js";
import { filterFreshArticles } from "../modules/dataStore/index.js";
import {
  Source,
  Article,
  SynthesizedEvent,
  RunVerdict,
} from "@headlines/models";
import { performStandardScraping } from "../scraper/standardScraper.js";
import mongoose from "mongoose";
import { settings } from "@headlines/config";
import colors from "ansi-colors";
import { findArticles, bulkWriteArticles } from "@headlines/data-access";

export async function runScrapeAndFilter(pipelinePayload) {
  logger.info("--- STAGE 2: SCRAPE & FILTER ---");
  const { runStatsManager, isRefreshMode, sourcesToScrape, emitter } = pipelinePayload;

  if (isRefreshMode) {
    logger.warn(
      "REFRESH MODE: Bypassing scraping. Finding ALL articles from the last 24h and resetting them for fresh processing.",
    );
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find ALL articles from the last 24h — no threshold filter, no event filter
    const articlesResult = await findArticles({
      filter: { createdAt: { $gte: cutoffDate } },
      select: "+articleContent",
      limit: 500,
    });
    if (!articlesResult.success) {
      throw new Error(
        `Failed to fetch articles for refresh: ${articlesResult.error}`,
      );
    }
    const articlesToReprocess = articlesResult.data;
    if (articlesToReprocess.length === 0) {
      logger.info("✅ No articles found from the last 24h to refresh. Ending run.");
      pipelinePayload.articlesForPipeline = [];
      return { success: true, payload: pipelinePayload };
    }

    // Delete associated synthesized events and run verdicts
    const articleLinks = articlesToReprocess.map((a) => a.link);
    const articleIdsToReset = articlesToReprocess.map((a) => a._id);
    const [eventsToDelete, verdictDeletion] = await Promise.all([
      SynthesizedEvent.find({
        "source_articles.link": { $in: articleLinks },
      }).select("_id"),
      RunVerdict.deleteMany({ createdAt: { $gte: cutoffDate } }),
    ]);
    const eventIdsToDelete = eventsToDelete.map((e) => e._id);
    if (eventIdsToDelete.length > 0) {
      await SynthesizedEvent.deleteMany({ _id: { $in: eventIdsToDelete } });
    }

    // Reset articles to scraped status, clearing all assessment/enrichment/event data
    await Article.updateMany(
      { _id: { $in: articleIdsToReset } },
      {
        $set: { status: "scraped" },
        $unset: {
          relevance_headline: "",
          assessment_headline: "",
          relevance_article: "",
          assessment_article: "",
          key_individuals: "",
          transactionType: "",
          tags: "",
          synthesizedEventId: "",
          one_line_summary: "",
          imageCachedPath: "",
          enrichment_error: "",
        },
      },
    );

    logger.info(
      colors.yellow(
        `Refresh prepared: ${articlesToReprocess.length} articles reset, ${eventIdsToDelete.length} events deleted, ${verdictDeletion.deletedCount} verdicts purged.`,
      ),
    );

    // Strip assessment/enrichment data from in-memory copies so Stage 3 re-processes them
    for (const article of articlesToReprocess) {
      delete article.relevance_headline
      delete article.assessment_headline
      delete article.relevance_article
      delete article.assessment_article
      delete article.key_individuals
      delete article.transactionType
      delete article.tags
      delete article.synthesizedEventId
      delete article.one_line_summary
      delete article.imageCachedPath
      delete article.enrichment_error
      article.status = 'scraped'
    }

    pipelinePayload.articlesForPipeline = articlesToReprocess;
    return { success: true, payload: pipelinePayload };
  }

  if (sourcesToScrape.length === 0) {
    logger.warn(
      "No active sources to scrape were passed from pre-flight stage. Ending run.",
    );
    return { success: true, payload: pipelinePayload };
  }

  const { scrapedArticles, scraperHealth } =
    await performStandardScraping(sourcesToScrape, pipelinePayload);

  runStatsManager.set("scraperHealth", scraperHealth);
  runStatsManager.set("headlinesScraped", scrapedArticles.length);
  auditLogger.info(
    {
      context: {
        all_scraped_headlines: scrapedArticles.map((a) => ({
          headline: a.headline,
          source: a.newspaper,
        })),
      },
    },
    "All Scraped Headlines",
  );

  const freshArticles = await filterFreshArticles(
    scrapedArticles,
    false,
    pipelinePayload.reprocess,
  );
  auditLogger.info(
    { context: { fresh_headlines: freshArticles.map((a) => a.headline) } },
    "Fresh Headlines After Filtering",
  );

  runStatsManager.set("freshHeadlinesFound", freshArticles.length);

  // ═══════════════════════════════════════════════════
  // CACHE & RETRY LOGIC - Find incomplete articles
  // ═══════════════════════════════════════════════════
  
  const incompleteEnrichmentFilter = { 
    status: { $in: ['failed_enrichment', 'pending_notification', 'failed_notification'] } 
  }
  const incompleteEnrichmentResult = await findArticles({
    filter: incompleteEnrichmentFilter,
    select: "+articleContent",
  })
  const incompleteEnrichmentArticles = incompleteEnrichmentResult.success ? incompleteEnrichmentResult.data.filter(a => {
    const failedAttempts = (a.pipelineTrace || []).filter(t => t.stage === 'enrichment' && t.status === 'error').length
    return failedAttempts < 3
  }) : []
  if (incompleteEnrichmentArticles.length > 0) {
    logger.info(`\x1b[33m▸ Retrying failed enrichments:\x1b[0m ${incompleteEnrichmentArticles.length}`)
    incompleteEnrichmentArticles.forEach(a => {
      logger.info(`\x1b[33m  ↻ "${a.headline?.substring(0, 60)}"\x1b[0m`)
    })
  }

  const incompleteHeadlineFilter = {
    status: 'failed_headline',
    relevance_headline: { $gte: 10 },
    headline: { $not: /^\s*\S+\s*$/ },
  }
  const incompleteHeadlineResult = await findArticles({
    filter: incompleteHeadlineFilter,
    select: "+articleContent",
  })
  const incompleteHeadlineArticles = incompleteHeadlineResult.success
    ? incompleteHeadlineResult.data.filter(a => {
        const failedAttempts = (a.pipelineTrace || []).filter(t =>
          t.stage === 'Headline Assessment' && (t.status === 'DROPPED' || t.status === 'failed' || t.status === 'error')
        ).length
        return failedAttempts < 3
      })
    : []
  if (incompleteHeadlineArticles.length > 0) {
    logger.info(`\x1b[33m▸ Retrying failed headlines:\x1b[0m ${incompleteHeadlineArticles.length}`)
    incompleteHeadlineArticles.forEach(a => {
      logger.info(`\x1b[33m  ↻ "${a.headline?.substring(0, 60)}"\x1b[0m`)
    })
  }
  if (incompleteHeadlineArticles.length > 0) {
    logger.info(`Found ${incompleteHeadlineArticles.length} failed_headline articles to retry (multi-word headlines).`)
  }

  const allArticlesToProcess = [...freshArticles, ...incompleteEnrichmentArticles, ...incompleteHeadlineArticles];

  if (freshArticles.length > 0) {
    const articlesToSave = freshArticles.map((article) => ({
      ...article,
      _id: new mongoose.Types.ObjectId(),
      status: "scraped",
    }));

    // Replace raw freshArticles with id-bearing versions so assessHeadlines can track them
    const savedLinks = new Map(articlesToSave.map(a => [a.link, a]))
    for (let i = 0; i < allArticlesToProcess.length; i++) {
      const saved = savedLinks.get(allArticlesToProcess[i].link)
      if (saved) allArticlesToProcess[i] = saved
    }

    const bulkOps = articlesToSave.map((article) => ({
      updateOne: {
        filter: { link: article.link },
        update: { $setOnInsert: article },
        upsert: true,
      },
    }));

    const result = await bulkWriteArticles(bulkOps);
    if (!result.success) {
      throw new Error(`Failed to save fresh articles: ${result.error}`);
    }
    logger.info(
      `Successfully saved ${result.result.upsertedCount} new articles to the database with status 'scraped'.`,
    );
  }

  if (allArticlesToProcess.length > 0) {
    pipelinePayload.articlesForPipeline = allArticlesToProcess;
  } else {
    logger.info("No new articles to process. Ending run early.");
    pipelinePayload.articlesForPipeline = [];
  }

  return { success: true, payload: pipelinePayload };
}
