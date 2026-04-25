// apps/pipeline/src/utils/housekeeping.js (version 3.0.0)
import { logger } from "@headlines/utils-shared";
import {
  findSourcesForScraping,
  performHousekeeping,
} from "@headlines/data-access";
import {
  healSource,
  incrementFailureCount,
} from "@headlines/scraper-logic/scraper/healSourceSelectors.js";
import { Source } from "@headlines/models";

const ARTICLE_RETENTION_DAYS = 14;

export async function triggerHealingForFailingSources() {
  logger.info("🔧 Checking for sources that need healing...");

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const failingSources = await Source.find({
      status: "active",
      $or: [
        {
          consecutiveFailures: { $gte: 5 },
          lastHealedAt: { $exists: false },
        },
        {
          consecutiveFailures: { $gte: 5 },
          lastHealedAt: { $lt: thirtyDaysAgo },
        },
      ],
    }).limit(10);

    if (failingSources.length === 0) {
      logger.info("Housekeeping: No sources eligible for healing.");
      return;
    }

    logger.info(
      {
        count: failingSources.length,
        sources: failingSources.map((s) => s.name),
      },
      "Found sources for healing",
    );

    let healedCount = 0;
    for (const source of failingSources) {
      const result = await healSource(source, "headline");
      if (result) {
        healedCount++;
      }
    }

    logger.info({ healedCount }, "Healing cycle complete");
  } catch (error) {
    logger.error({ err: error }, "Healing trigger failed");
  }
}

export async function recordSourceFailure(sourceId) {
  await incrementFailureCount(sourceId);
}

export async function performDatabaseHousekeeping() {
  logger.info("🧹 Performing database housekeeping...");

  try {
    const dynamicSourcesResult = await findSourcesForScraping({
      isDynamicContent: true,
    });
    if (!dynamicSourcesResult.success)
      throw new Error(dynamicSourcesResult.error);

    const dynamicNewspaperNames = dynamicSourcesResult.data.map((s) => s.name);
    if (dynamicNewspaperNames.length === 0) {
      logger.info(
        "Housekeeping: No sources marked for dynamic content cleanup. Skipping.",
      );
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ARTICLE_RETENTION_DAYS);
    const deletionCriteria = {
      newspaper: { $in: dynamicNewspaperNames },
      createdAt: { $lt: cutoffDate },
      $and: [
        {
          $or: [
            { relevance_headline: { $lt: 25 } },
            { relevance_headline: { $exists: false } },
          ],
        },
        {
          $or: [
            { relevance_article: { $lt: 25 } },
            { relevance_article: { $exists: false } },
          ],
        },
      ],
    };

    const result = await performHousekeeping(deletionCriteria);
    if (!result.success) throw new Error(result.error);

    if (result.deletedCount > 0) {
      logger.info(
        `Housekeeping complete. Deleted ${result.deletedCount} old, irrelevant articles.`,
      );
    } else {
      logger.info(
        "Housekeeping complete. No old, irrelevant articles to delete.",
      );
    }
  } catch (error) {
    logger.error({ err: error }, "Database housekeeping failed.");
  }
}
