// packages/scraper-logic/src/scraper/headlineScraper.js (version 5.2.0)
import * as cheerio from 'cheerio'
import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import Parser from 'rss-parser'
import { Source } from '@headlines/models'
import { BROWSER_HEADERS } from './constants.js'
import { fetchPageWithPlaywright } from '../browser.js'
import { getConfig } from '../config.js'
import { extractorRegistry } from './extractors/index.js'
import { dynamicExtractor } from './dynamicExtractor.js'

const rssParser = new Parser({
  customFields: {
    item: [['content:encoded', 'contentEncoded']],
  },
})

async function saveDebugHtml(filename, html) {
  const config = getConfig();
  const DEBUG_HTML_DIR = config.paths?.debugHtmlDir;
  if (!DEBUG_HTML_DIR) return;
  try {
    await fs.mkdir(DEBUG_HTML_DIR, { recursive: true })
    const filePath = path.join(DEBUG_HTML_DIR, filename)
    await fs.writeFile(filePath, html)
  } catch (error) {
    getConfig().logger.error({ err: error, file: filename }, 'Failed to save debug HTML.')
  }
}

async function fetchHeadlinesViaRss(source) {
  try {
    const feed = await rssParser.parseURL(source.rssUrl);
    if (!feed.items || feed.items.length === 0) {
      throw new Error('RSS feed was empty or invalid.');
    }
    const articles = feed.items
      .map((item) => {
        const rssContentHtml = item.contentEncoded || item.contentSnippet || item.content || '';
        const rssContent = cheerio.load(rssContentHtml).text().replace(/\s+/g, ' ').trim();
        return { headline: item.title?.trim(), link: item.link, rssContent: rssContent || null };
      })
      .filter((item) => item.headline && item.link);
    return { articles, error: null };
  } catch (error) {
    const failureReason = error.message || 'Unknown RSS error.';
    getConfig().logger.warn({ url: source.rssUrl, reason: failureReason }, `[RSS] Feed parsing failed for "${source.name}". Auto-disabling.`);
    
    try {
      await Source.updateOne(
        { _id: source._id },
        { 
          $set: { 
            rssUrl: null,
            notes: `${source.notes || ''}\n[${new Date().toISOString()}] RSS URL disabled due to error: ${failureReason}`.trim(),
          } 
        }
      );
    } catch (dbError) {
      getConfig().logger.error({ err: dbError }, 'Failed to auto-disable RSS URL in database.');
    }
    return { articles: [], error: failureReason };
  }
}

async function fetchPageStatic(url) {
  try {
    const { data } = await axios.get(url, { headers: BROWSER_HEADERS, timeout: 25000 })
    return { html: data, error: null }
  } catch (error) {
    getConfig().logger.warn({ url, err: { message: error.message } }, `[Axios] Static fetch failed`)
    return { html: null, error: error.message }
  }
}

async function fetchWithPlaywrightWrapped(source) {
  const html = await fetchPageWithPlaywright(source.sectionUrl, 'HeadlineScraper', {
    timeout: source.playwrightTimeoutMs,
    waitForSelector: source.waitForSelector,
  })
  if (html) {
    return { html, error: null }
  }
  return {
    html: null,
    error: `Playwright failed to fetch content from ${source.sectionUrl}`,
  }
}

export async function scrapeSiteForHeadlines(source) {
  if (source.rssUrl) {
    getConfig().logger.info(`[Scraping] Attempting RSS scrape for "${source.name}"...`);
    const rssResult = await fetchHeadlinesViaRss(source);
    if (rssResult.articles.length > 0) {
      return { articles: rssResult.articles, success: true, resultCount: rssResult.articles.length, error: null };
    }
    getConfig().logger.warn(`RSS scrape failed for "${source.name}". Falling back to HTML scraping.`);
  }

  const fetcher = source.isStatic ? () => fetchPageStatic(source.sectionUrl) : () => fetchWithPlaywrightWrapped(source);
  const fetcherName = source.isStatic ? 'STATIC (fast)' : 'PLAYWRIGHT (full-browser)';
  getConfig().logger.info(`[Scraping] Initiating HTML scrape for "${source.name}" using ${fetcherName}...`);

  const { html, error } = await fetcher();
  if (!html) return { articles: [], success: false, error, debugHtml: null };

  const $ = cheerio.load(html);
  const articles = [];
  
  if (source.extractionMethod === 'json-ld') {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const jsonData = JSON.parse($(el).html())
          const potentialLists = [jsonData, ...(jsonData['@graph'] || [])]
          potentialLists.forEach((list) => {
            const items = list?.itemListElement
            if (items && Array.isArray(items)) {
              items.forEach((item) => {
                const headline = item.name || item.item?.name
                const url = item.url || item.item?.url
                if (headline && url) {
                  articles.push({ headline: headline.trim(), link: new URL(url, source.baseUrl).href });
                }
              })
            }
          })
        } catch (e) { /* Ignore parsing errors */ }
      })
  } else { // 'declarative' or 'custom'
      const selectors = Array.isArray(source.headlineSelector) ? source.headlineSelector : [source.headlineSelector].filter(Boolean);
      const extractorFn = source.extractionMethod === 'custom' ? extractorRegistry[source.extractorKey] : dynamicExtractor;
      if (!extractorFn) {
          return { articles: [], success: false, error: `No valid extractor for method: ${source.extractionMethod}` };
      }
      for (const selector of selectors) {
        $(selector).each((_, el) => {
            const articleData = extractorFn($, el, source);
            if (articleData?.headline && articleData?.link) {
                articleData.link = new URL(articleData.link, source.baseUrl).href;
                articles.push(articleData);
            }
        });
      }
  }

  const uniqueArticles = Array.from(new Map(articles.map((a) => [a.link, a])).values());

  if (uniqueArticles.length === 0) {
    const filename = `${source.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_headline_fail.html`;
    await saveDebugHtml(filename, html);
    return { articles: [], success: false, error: 'Extracted 0 headlines.', debugHtml: html };
  }

  return { articles: uniqueArticles, success: true, resultCount: uniqueArticles.length, error: null };
}
