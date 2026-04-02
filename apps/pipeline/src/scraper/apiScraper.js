// apps/pipeline/src/scraper/apiScraper.js
import { logger } from "@headlines/utils-shared";
import axios from "axios";

const API_RATE_LIMIT_DELAY = 1000; // 1 second between requests

export async function scrapeApiSource(source) {
  const { name, baseUrl, sectionUrl, apiEndpoint, apiKey, country, language } =
    source;

  logger.info(`[API Scraper] Starting for "${name}"...`);

  if (!apiEndpoint) {
    return {
      success: false,
      error: "No API endpoint configured",
      resultCount: 0,
      articles: [],
    };
  }

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // Build the URL - combine baseUrl with sectionUrl or apiEndpoint
    const url = sectionUrl || `${baseUrl}${apiEndpoint}`;

    const response = await axios.get(url, {
      headers,
      params: {
        // Common pagination/filtering params
        pageSize: 50,
        page: 1,
      },
      timeout: 30000,
    });

    // Transform API response to articles
    const articles = transformApiResponse(response.data, source);

    logger.info(
      `[API Scraper] <- Finished for "${name}". Found: ${articles.length} articles`,
    );

    return {
      success: true,
      resultCount: articles.length,
      articles,
    };
  } catch (error) {
    logger.error(`[API Scraper] FAILED for "${name}": ${error.message}`);
    return {
      success: false,
      error: error.message,
      resultCount: 0,
      articles: [],
    };
  }
}

function transformApiResponse(data, source) {
  const { name: sourceName, country, language, apiResponseMapping } = source;

  // Default mapping structure - can be overridden per source
  const mapping = apiResponseMapping || {
    itemsPath: "articles",
    headlineField: "title",
    summaryField: "summary",
    urlField: "url",
    dateField: "publishedAt",
    sourceField: "source",
  };

  let items = data;

  // Navigate to items path if specified
  if (mapping.itemsPath) {
    const paths = mapping.itemsPath.split(".");
    for (const path of paths) {
      items = items?.[path];
    }
  }

  if (!Array.isArray(items)) {
    logger.warn(`[API Scraper] No items found in response for "${sourceName}"`);
    return [];
  }

  return items
    .map((item) => {
      const headline =
        item[mapping.headlineField] || item.title || item.headline;
      const summary =
        item[mapping.summaryField] || item.description || item.summary;
      const link = item[mapping.urlField] || item.url || item.link;
      const pubDate = item[mapping.dateField] || item.publishedAt || item.date;

      // Only return if we have at least a headline and link
      if (!headline || !link) {
        return null;
      }

      return {
        headline: headline.trim(),
        summary: summary?.trim() || "",
        link: link.trim(),
        pubDate: pubDate
          ? new Date(pubDate).toISOString()
          : new Date().toISOString(),
        source: sourceName,
        newspaper: sourceName,
        country: country,
        language: language,
        status: "scraped",
      };
    })
    .filter(Boolean);
}

// Register API sources by name
export const API_SCRAPERS = {
  businesswire: scrapeApiSource,
  prnewswire: scrapeApiSource,
  globenewswire: scrapeApiSource,
};

export async function scrapeApiSourceByName(sourceName, sourceConfig) {
  const scraper = API_SCRAPERS[sourceName.toLowerCase()];
  if (scraper) {
    return scraper(sourceConfig);
  }
  // Default: generic API scraper
  return scrapeApiSource(sourceConfig);
}
