// apps/pipeline/scripts/seed/seed-sources-api.js
// Seeds API-based sources like Business Wire, PRNewswire, etc.
import { logger } from "@headlines/utils-shared";
import { initializeScriptEnv } from "./lib/script-init.js";
import { createSource } from "@headlines/data-access";

const API_SOURCES = [
  {
    name: "Business Wire",
    baseUrl: "https://www.businesswire.com",
    sectionUrl: "/portal/site/home/",
    country: "United States",
    language: "en",
    status: "active",
    scrapeFrequency: "high",
    extractionMethod: "api",
    apiEndpoint: "/portal/site/home/feeds/",
    notes:
      "M&A and corporate press releases. Priority source for wealth events.",
  },
  {
    name: "PRNewswire",
    baseUrl: "https://www.prnewswire.com",
    sectionUrl: "/news-releases/business-wire-news-releases.html",
    country: "United States",
    language: "en",
    status: "active",
    scrapeFrequency: "high",
    extractionMethod: "api",
    apiEndpoint: "/news-releases/latest-headlines.rss",
    notes: "Press releases including M&A, IPOs, and corporate news.",
  },
];

async function seedApiSources() {
  await initializeScriptEnv();
  logger.info("🚀 Seeding API-based sources...");

  for (const sourceData of API_SOURCES) {
    try {
      const result = await createSource(sourceData);
      if (result.success) {
        logger.info(`✅ Created source: ${sourceData.name}`);
      } else {
        if (result.error.includes("already exists")) {
          logger.info(`⏭️  Source already exists: ${sourceData.name}`);
        } else {
          logger.error(
            `❌ Failed to create ${sourceData.name}: ${result.error}`,
          );
        }
      }
    } catch (error) {
      logger.error(
        { err: error },
        `❌ Error creating source: ${sourceData.name}`,
      );
    }
  }

  logger.info("✅ API sources seeding complete.");
}

seedApiSources();
