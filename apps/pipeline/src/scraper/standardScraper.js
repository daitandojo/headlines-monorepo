// apps/pipeline/src/scraper/standardScraper.js
import pLimit from "p-limit";
import { logger } from "@headlines/utils-shared";
import { scrapeSiteForHeadlines } from "@headlines/scraper-logic/scraper/index.js";
import { scrapeApiSource } from "./apiScraper.js";
import { updateSourceAnalyticsBatch } from "@headlines/data-access";
import { env } from "@headlines/config";

export async function performStandardScraping(sourcesToScrape, pipelinePayload) {
  if (sourcesToScrape.length === 0) {
    return { scrapedArticles: [], scraperHealth: [] };
  }

  const limit = pLimit(env.CONCURRENCY_LIMIT || 3);
  const emitter = pipelinePayload?.emitter
  logger.info(
    `Pipeline will now scrape ${sourcesToScrape.length} active standard sources.`,
  )

  if (emitter) {
    emitter.setSourcesTotal(sourcesToScrape.length)
    emitter.stageStart('scrape')
  }

  let allArticles = [];
  const scraperHealthMap = new Map();
  let sourceIndex = 0

  const promises = sourcesToScrape.map((source) =>
    limit(async () => {
      sourceIndex++
      if (emitter) emitter.sourceStart(source.name, sourceIndex, sourcesToScrape.length)
      logger.info(`[Scraping] -> Starting scrape for "${source.name}"...`);

      let result;
      if (source.extractionMethod === "api") {
        result = await scrapeApiSource(source);
      } else {
        result = await scrapeSiteForHeadlines(source);
      }

      const foundCount =
        result.resultCount !== undefined ? result.resultCount : 0;
      logger.info(
        `[Scraping] <- Finished scrape for "${source.name}". Success: ${result.success}, Found: ${foundCount}`,
      );

      if (emitter) {
        emitter.sourceDone(source.name, {
          headlineCount: foundCount,
          freshCount: foundCount,
          error: result.error || null,
        })
      }
      return { source, result };
    }),
  );
  const results = await Promise.all(promises);

  const bulkUpdateOps = [];

  for (const { source, result } of results) {
    const healthReport = {
      source: source.name,
      success: result.success && result.resultCount > 0,
      count: result.resultCount || 0,
      error: result.error,
      debugHtml: result.debugHtml,
      failedSelector: result.success ? null : source.headlineSelector,
    };
    scraperHealthMap.set(source.name, healthReport);

    if (healthReport.success) {
      allArticles.push(
        ...result.articles.map((a) => ({
          ...a,
          source: source.name,
          newspaper: source.name,
          country: source.country,
        })),
      );
      bulkUpdateOps.push({
        updateOne: {
          filter: { _id: source._id },
          update: {
            $set: {
              lastScrapedAt: new Date(),
              lastSuccessAt: new Date(),
              consecutiveFailures: 0,
            },
          },
        },
      });
    } else {
      logger.warn(
        `[Scraping] ❌ FAILED for "${source.name}": ${result.error || "Extracted 0 headlines."}.`,
      );
      bulkUpdateOps.push({
        updateOne: {
          filter: { _id: source._id },
          update: { $set: { lastScrapedAt: new Date() } },
        },
      });
    }
  }

  if (bulkUpdateOps.length > 0) {
    await updateSourceAnalyticsBatch(bulkUpdateOps);
  }

  return {
    scrapedArticles: allArticles,
    scraperHealth: Array.from(scraperHealthMap.values()),
  };
}
