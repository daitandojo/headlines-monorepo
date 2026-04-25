// packages/scraper-logic/src/scraper/healSourceSelectors.js
import * as cheerio from "cheerio";
import { settings } from "@headlines/config/node";
import { logger } from "@headlines/utils-shared";
import { getConfig } from "../config.js";
import { fetchPageWithPlaywright } from "../browser.js";
import { callLanguageModel } from "@headlines/ai-services";
import { Source } from "@headlines/models";

const HEALING_MODEL = settings.LLM_MODEL_HEADLINE_ASSESSMENT;

const HEADLINE_SYSTEM_PROMPT = `You are an expert web scraper selector healer. Given HTML from a news source page, your task is to find the CSS selectors that will reliably extract article headlines and their links.

Analyze the HTML structure carefully. Look for:
- Article titles/headlines: headings (h1, h2, h3), article titles, card titles
- Links: anchor tags containing article URLs
- Common patterns: article cards, news items, story blocks

Return ONLY valid CSS selectors that will match multiple article elements. Do not use IDs (#) - use classes (.) or element selectors.`;

const HEADLINE_USER_PROMPT = `Source: {sourceName}
Country: {country}
Language: {language}
URL: {url}

Analyze the HTML below and provide the best CSS selectors for extracting headlines and article links from this news source page.

HTML:
{html}

Respond in JSON format:
{{
  "headlineSelector": "CSS selector for headlines",
  "linkSelector": "CSS selector for links within headline elements (can be empty if same as headlineSelector)"
}}`;

const CONTENT_SYSTEM_PROMPT = `You are an expert web scraper selector healer. Given HTML from an article page, your task is to find the CSS selectors that will extract the main article content (text body).

Analyze the HTML structure carefully. Look for:
- Main content areas: article, main, [role="main"], section.content, .article-body
- Paragraphs: p elements within content areas
- Avoid: navigation, sidebar, comments, related articles, ads

Return ONLY valid CSS selectors that will extract the main article text content.`;

const CONTENT_USER_PROMPT = `Source: {sourceName}
URL: {url}

Analyze the HTML below and provide the best CSS selectors for extracting the main article text content.

HTML (first 15000 chars):
{html}

Respond in JSON format:
{{
  "contentSelectors": ["CSS selector for main content area"],
  "fallbackSelectors": ["optional fallback selectors if main fails"]
}}`;

async function fetchHtmlForHealing(url, fetcherType = "Playwright") {
  const config = getConfig();
  try {
    const html = await fetchPageWithPlaywright(url, "SelectorHealer", {
      timeout: 30000,
    });
    if (!html) {
      throw new Error("No HTML returned from fetcher");
    }
    return html;
  } catch (error) {
    config.logger.error(
      { err: error.message, url },
      "Failed to fetch HTML for healing",
    );
    return null;
  }
}

function analyzeHeadlineFailure(articles, source) {
  const issues = [];
  if (!articles || articles.length === 0) {
    issues.push("Extracted 0 headlines");
  }
  if (articles?.length > 0) {
    const validArticles = articles.filter((a) => a.headline && a.link);
    if (validArticles.length === 0) {
      issues.push("All extracted items missing headlines or links");
    }
  }
  return issues;
}

function analyzeContentFailure(article) {
  const issues = [];
  if (article.enrichment_error) {
    issues.push(article.enrichment_error);
  }
  if (
    article.articleContent?.contents?.[0]?.length < settings.MIN_ARTICLE_CHARS
  ) {
    issues.push(
      `Content too short (${article.articleContent?.contents?.[0]?.length || 0} chars)`,
    );
  }
  return issues;
}

export async function healHeadlineSelectors(source, htmlContent) {
  const config = getConfig();
  const log = config.logger;

  log.info({ source: source.name }, "Attempting to heal headline selectors");

  const truncatedHtml = htmlContent?.substring(0, 25000);
  if (!truncatedHtml) {
    log.error({ source: source.name }, "No HTML available for healing");
    return null;
  }

  const userContent = HEADLINE_USER_PROMPT.replace("{sourceName}", source.name)
    .replace("{country}", source.country)
    .replace("{language}", source.language)
    .replace("{url}", source.sectionUrl)
    .replace("{html}", truncatedHtml);

  const result = await callLanguageModel({
    modelName: HEALING_MODEL,
    systemPrompt: HEADLINE_SYSTEM_PROMPT,
    userContent,
    isJson: true,
  });

  if (result.error || !result.headlineSelector) {
    log.error({ err: result.error, source: source.name }, "LLM healing failed");
    return null;
  }

  log.info(
    { source: source.name, selectors: result },
    "LLM suggested new selectors",
  );

  const $ = cheerio.load(htmlContent);
  const testElements = $(result.headlineSelector);
  if (testElements.length === 0) {
    log.warn(
      { selector: result.headlineSelector, source: source.name },
      "Suggested selector matches 0 elements, not saving",
    );
    return null;
  }

  log.info(
    { source: source.name, matches: testElements.length },
    "Selector validation passed",
  );

  return {
    headlineSelector: [result.headlineSelector],
    linkSelector: result.linkSelector || null,
  };
}

export async function healContentSelectors(source, articleHtml) {
  const config = getConfig();
  const log = config.logger;

  log.info({ source: source.name }, "Attempting to heal content selectors");

  const truncatedHtml = articleHtml?.substring(0, 15000);
  if (!truncatedHtml) {
    log.error({ source: source.name }, "No article HTML available for healing");
    return null;
  }

  const userContent = CONTENT_USER_PROMPT.replace("{sourceName}", source.name)
    .replace("{url}", source.sectionUrl)
    .replace("{html}", truncatedHtml);

  const result = await callLanguageModel({
    modelName: HEALING_MODEL,
    systemPrompt: CONTENT_SYSTEM_PROMPT,
    userContent,
    isJson: true,
  });

  if (result.error || !result.contentSelectors) {
    log.error(
      { err: result.error, source: source.name },
      "LLM content healing failed",
    );
    return null;
  }

  log.info(
    { source: source.name, selectors: result },
    "LLM suggested content selectors",
  );

  return {
    contentSelectors: result.contentSelectors,
    fallbackSelectors: result.fallbackSelectors || [],
  };
}

export async function updateSourceWithHealedSelectors(
  sourceId,
  selectors,
  type,
) {
  const config = getConfig();
  const log = config.logger;

  try {
    const updateFields = {};
    if (type === "headline") {
      if (selectors.headlineSelector) {
        updateFields.headlineSelector = selectors.headlineSelector;
      }
      if (selectors.linkSelector) {
        updateFields.linkSelector = selectors.linkSelector;
      }
    } else if (type === "content") {
      if (selectors.contentSelectors) {
        updateFields.contentSelectors = selectors.contentSelectors;
      }
      if (selectors.fallbackSelectors) {
        updateFields.fallbackSelectors = selectors.fallbackSelectors;
      }
    }

    updateFields.lastHealedAt = new Date();

    await Source.updateOne({ _id: sourceId }, { $set: updateFields });

    log.info(
      { sourceId, type, selectors },
      "Source updated with healed selectors",
    );
    return true;
  } catch (error) {
    log.error(
      { err: error.message, sourceId },
      "Failed to update source with healed selectors",
    );
    return false;
  }
}

export async function shouldHealSource(source) {
  const THRESHOLD = 5;
  const DAYS_SINCE_HEALING = 30;

  const now = new Date();
  const thirtyDaysAgo = new Date(
    now.getTime() - DAYS_SINCE_HEALING * 24 * 60 * 60 * 1000,
  );

  if (!source.lastHealedAt && source.consecutiveFailures >= THRESHOLD) {
    return true;
  }

  if (source.lastHealedAt && source.consecutiveFailures >= THRESHOLD) {
    if (new Date(source.lastHealedAt) < thirtyDaysAgo) {
      return true;
    }
  }

  return false;
}

export async function incrementFailureCount(sourceId) {
  try {
    await Source.updateOne(
      { _id: sourceId },
      {
        $inc: { consecutiveFailures: 1 },
        $set: { lastScrapedAt: new Date() },
      },
    );
  } catch (error) {
    getConfig().logger.error(
      { err: error.message, sourceId },
      "Failed to increment failure count",
    );
  }
}

export async function resetFailureCount(sourceId) {
  try {
    await Source.updateOne(
      { _id: sourceId },
      {
        $set: { consecutiveFailures: 0, lastSuccessAt: new Date() },
      },
    );
  } catch (error) {
    getConfig().logger.error(
      { err: error.message, sourceId },
      "Failed to reset failure count",
    );
  }
}

export async function healSource(source, failureType = "headline") {
  const config = getConfig();
  const log = config.logger;

  const shouldHeal = await shouldHealSource(source);
  if (!shouldHeal) {
    log.debug({ source: source.name }, "Source not eligible for healing");
    return null;
  }

  log.info(
    { source: source.name, type: failureType },
    "Healing source selectors",
  );

  let html = null;
  let healedSelectors = null;

  if (failureType === "headline") {
    html = await fetchHtmlForHealing(source.sectionUrl);
    if (html) {
      healedSelectors = await healHeadlineSelectors(source, html);
    }
  } else if (failureType === "content") {
    html = await fetchHtmlForHealing(source.baseUrl);
    if (html) {
      healedSelectors = await healContentSelectors(source, html);
    }
  }

  if (healedSelectors) {
    await updateSourceWithHealedSelectors(
      source._id,
      healedSelectors,
      failureType,
    );
    return healedSelectors;
  }

  return null;
}
