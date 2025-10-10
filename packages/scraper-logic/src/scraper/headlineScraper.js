// packages/scraper-logic/src/scraper/headlineScraper.js (version 6.0.0)
import * as cheerio from 'cheerio'
import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import Parser from 'rss-parser'
import { Source } from '../../../models/src/index.js'
import { BROWSER_HEADERS } from './constants.js'
import { fetchPageWithPlaywright } from '../browser.js'
import { getConfig } from '../config.js'
import { extractorRegistry } from './extractors/index.js'
import { dynamicExtractor } from './dynamicExtractor.js'

/**
 * RSS parser with custom field mappings for content extraction
 */
const rssParser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['media:content', 'mediaContent'],
      ['description', 'description'],
    ],
  },
  timeout: 15000,
  maxRedirects: 3,
})

/**
 * Saves HTML to debug directory with timestamp for troubleshooting
 * @param {string} filename - Base filename
 * @param {string} html - HTML content
 * @param {Object} metadata - Additional context to save
 * @returns {Promise<string|null>} Path to saved file
 */
async function saveDebugHtml(filename, html, metadata = {}) {
  const config = getConfig()
  const debugDir = config.paths?.debugHtmlDir
  if (!debugDir) return null

  try {
    await fs.mkdir(debugDir, { recursive: true })

    // Add timestamp to prevent overwriting
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const baseFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const htmlPath = path.join(debugDir, `${baseFilename}_${timestamp}.html`)
    const metaPath = path.join(debugDir, `${baseFilename}_${timestamp}.json`)

    await fs.writeFile(htmlPath, html)

    // Save metadata for context
    if (Object.keys(metadata).length > 0) {
      await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2))
    }

    return htmlPath
  } catch (error) {
    config.logger.error({ err: error, file: filename }, 'Failed to save debug HTML.')
    return null
  }
}

/**
 * Cleans and normalizes RSS content text
 * @param {string} htmlContent - Raw HTML content from RSS
 * @returns {string} Cleaned text content
 */
function cleanRssContent(htmlContent) {
  if (!htmlContent) return ''

  const $ = cheerio.load(htmlContent)

  // Remove common unwanted elements
  $('script, style, iframe, img').remove()

  return $.text()
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Validates and normalizes article URLs
 * @param {string} url - Raw URL from feed or extraction
 * @param {string} baseUrl - Base URL for relative links
 * @returns {string|null} Normalized URL or null if invalid
 */
function normalizeUrl(url, baseUrl) {
  if (!url) return null

  try {
    // Handle relative URLs
    const normalized = new URL(url, baseUrl).href

    // Basic validation - must be http(s)
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      return null
    }

    return normalized
  } catch (error) {
    getConfig().logger.debug(
      { url, baseUrl, err: error.message },
      'URL normalization failed'
    )
    return null
  }
}

/**
 * Fetches and parses RSS feed with enhanced error handling
 * @param {Object} source - Source configuration
 * @returns {Promise<Object>} Articles array and error status
 */
async function fetchHeadlinesViaRss(source) {
  const logger = getConfig().logger
  const startTime = Date.now()

  try {
    logger.debug({ url: source.rssUrl }, 'Fetching RSS feed')

    const feed = await rssParser.parseURL(source.rssUrl)

    if (!feed.items || feed.items.length === 0) {
      throw new Error('RSS feed was empty or invalid.')
    }

    const articles = feed.items
      .map((item) => {
        // Try multiple content fields in order of preference
        const rssContentHtml =
          item.contentEncoded ||
          item.content ||
          item.description ||
          item.contentSnippet ||
          ''

        const rssContent = cleanRssContent(rssContentHtml)
        const link = normalizeUrl(item.link || item.guid, source.baseUrl)

        // Validate required fields
        if (!item.title?.trim() || !link) {
          return null
        }

        return {
          headline: item.title.trim(),
          link,
          rssContent: rssContent || null,
          pubDate: item.pubDate || item.isoDate || null,
        }
      })
      .filter(Boolean) // Remove null entries

    const duration = Date.now() - startTime

    logger.info(
      {
        source: source.name,
        count: articles.length,
        duration: `${duration}ms`,
      },
      'RSS feed parsed successfully'
    )

    return { articles, error: null }
  } catch (error) {
    const duration = Date.now() - startTime
    const failureReason = error.message || 'Unknown RSS error.'

    logger.warn(
      {
        url: source.rssUrl,
        reason: failureReason,
        duration: `${duration}ms`,
      },
      `RSS feed parsing failed for "${source.name}". Auto-disabling.`
    )

    // Auto-disable failing RSS feeds
    try {
      await Source.updateOne(
        { _id: source._id },
        {
          $set: {
            rssUrl: null,
            notes:
              `${source.notes || ''}\n[${new Date().toISOString()}] RSS URL auto-disabled: ${failureReason}`.trim(),
            lastRssError: {
              message: failureReason,
              timestamp: new Date(),
              attempts: (source.lastRssError?.attempts || 0) + 1,
            },
          },
        }
      )
      logger.info({ source: source.name }, 'RSS URL disabled in database')
    } catch (dbError) {
      logger.error(
        { err: dbError, source: source.name },
        'Failed to auto-disable RSS URL in database'
      )
    }

    return { articles: [], error: failureReason }
  }
}

/**
 * Fetches page using fast static method (axios)
 * @param {string} url - URL to fetch
 * @param {number} timeout - Request timeout in ms
 * @returns {Promise<Object>} HTML content and error status
 */
async function fetchPageStatic(url, timeout = 25000) {
  const logger = getConfig().logger
  const startTime = Date.now()

  try {
    const { data, status, headers } = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout,
      maxRedirects: 5,
      validateStatus: (status) => status < 400, // Accept redirects but not errors
    })

    const duration = Date.now() - startTime

    logger.debug(
      {
        url,
        status,
        contentType: headers['content-type'],
        size: data.length,
        duration: `${duration}ms`,
      },
      'Static fetch successful'
    )

    return { html: data, error: null }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorDetails = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      duration: `${duration}ms`,
    }

    logger.warn({ url, err: errorDetails }, 'Static fetch failed')

    return {
      html: null,
      error: `Static fetch failed: ${error.message}`,
    }
  }
}

/**
 * Fetches page using Playwright browser automation
 * @param {Object} source - Source configuration
 * @returns {Promise<Object>} HTML content and error status
 */
async function fetchWithPlaywrightWrapped(source) {
  const logger = getConfig().logger
  const startTime = Date.now()

  try {
    const html = await fetchPageWithPlaywright(source.sectionUrl, 'HeadlineScraper', {
      timeout: source.playwrightTimeoutMs,
      waitForSelector: source.waitForSelector,
    })

    if (!html) {
      throw new Error('Playwright returned empty content')
    }

    const duration = Date.now() - startTime

    logger.debug(
      {
        url: source.sectionUrl,
        size: html.length,
        duration: `${duration}ms`,
      },
      'Playwright fetch successful'
    )

    return { html, error: null }
  } catch (error) {
    const duration = Date.now() - startTime

    logger.warn(
      {
        url: source.sectionUrl,
        err: error.message,
        duration: `${duration}ms`,
      },
      'Playwright fetch failed'
    )

    return {
      html: null,
      error: `Playwright failed: ${error.message}`,
    }
  }
}

/**
 * Extracts articles using JSON-LD structured data
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Object} source - Source configuration
 * @returns {Array} Extracted articles
 */
function extractFromJsonLd($, source) {
  const articles = []
  const processedUrls = new Set()

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const jsonData = JSON.parse($(el).html())

      // Handle both direct objects and @graph arrays
      const potentialLists = [jsonData, ...(jsonData['@graph'] || [])]

      potentialLists.forEach((item) => {
        // Handle ItemList structures
        const items = item?.itemListElement || (Array.isArray(item) ? item : [item])
        const itemArray = Array.isArray(items) ? items : [items]

        itemArray.forEach((element) => {
          // Support multiple JSON-LD structures
          const headline =
            element.name ||
            element.headline ||
            element.item?.name ||
            element.item?.headline

          const url = element.url || element.item?.url || element['@id']

          if (headline && url) {
            const normalizedUrl = normalizeUrl(url, source.baseUrl)

            // Deduplicate by URL
            if (normalizedUrl && !processedUrls.has(normalizedUrl)) {
              processedUrls.add(normalizedUrl)
              articles.push({
                headline: headline.trim(),
                link: normalizedUrl,
                description: element.description || element.item?.description || null,
              })
            }
          }
        })
      })
    } catch (error) {
      getConfig().logger.debug(
        { err: error.message },
        'JSON-LD parsing error (non-critical)'
      )
    }
  })

  return articles
}

/**
 * Extracts articles using CSS selectors (declarative or custom extractors)
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Object} source - Source configuration
 * @returns {Array} Extracted articles
 */
function extractFromSelectors($, source) {
  const articles = []
  const processedUrls = new Set()

  // Normalize selectors to array
  const selectors = Array.isArray(source.headlineSelector)
    ? source.headlineSelector
    : [source.headlineSelector].filter(Boolean)

  if (selectors.length === 0) {
    getConfig().logger.warn({ source: source.name }, 'No headline selectors defined')
    return articles
  }

  // Get appropriate extractor function
  const extractorFn =
    source.extractionMethod === 'custom'
      ? extractorRegistry[source.extractorKey]
      : dynamicExtractor

  if (!extractorFn) {
    getConfig().logger.error(
      {
        source: source.name,
        method: source.extractionMethod,
        key: source.extractorKey,
      },
      'No valid extractor function found'
    )
    return articles
  }

  // Process each selector
  for (const selector of selectors) {
    try {
      const elements = $(selector)

      if (elements.length === 0) {
        getConfig().logger.debug(
          { selector, source: source.name },
          'Selector matched 0 elements'
        )
        continue
      }

      elements.each((_, el) => {
        try {
          const articleData = extractorFn($, el, source)

          if (!articleData?.headline || !articleData?.link) {
            return // Skip invalid extractions
          }

          const normalizedUrl = normalizeUrl(articleData.link, source.baseUrl)

          // Deduplicate and validate
          if (normalizedUrl && !processedUrls.has(normalizedUrl)) {
            processedUrls.add(normalizedUrl)
            articles.push({
              ...articleData,
              link: normalizedUrl,
            })
          }
        } catch (error) {
          getConfig().logger.debug(
            { err: error.message, selector },
            'Element extraction failed'
          )
        }
      })
    } catch (error) {
      getConfig().logger.warn(
        { err: error.message, selector },
        'Selector processing failed'
      )
    }
  }

  return articles
}

/**
 * Main function to scrape headlines from a source
 * @param {Object} source - Source configuration object
 * @returns {Promise<Object>} Scraping results with articles and metadata
 */
export async function scrapeSiteForHeadlines(source) {
  const logger = getConfig().logger
  const startTime = Date.now()

  // 1. Try RSS first if available
  if (source.rssUrl) {
    logger.info({ source: source.name }, 'Attempting RSS scrape')

    const rssResult = await fetchHeadlinesViaRss(source)

    if (rssResult.articles.length > 0) {
      const duration = Date.now() - startTime

      logger.info(
        {
          source: source.name,
          count: rssResult.articles.length,
          duration: `${duration}ms`,
        },
        '✅ RSS scrape successful'
      )

      return {
        articles: rssResult.articles,
        success: true,
        resultCount: rssResult.articles.length,
        error: null,
        method: 'RSS',
        duration,
      }
    }

    logger.warn(
      { source: source.name },
      'RSS scrape failed. Falling back to HTML scraping.'
    )
  }

  // 2. Fall back to HTML scraping
  const fetcher = source.isStatic
    ? () => fetchPageStatic(source.sectionUrl, source.staticTimeoutMs)
    : () => fetchWithPlaywrightWrapped(source)

  const fetcherName = source.isStatic ? 'STATIC (axios)' : 'PLAYWRIGHT (browser)'

  logger.info({ source: source.name, method: fetcherName }, 'Initiating HTML scrape')

  const { html, error: fetchError } = await fetcher()

  if (!html) {
    const duration = Date.now() - startTime

    logger.error(
      {
        source: source.name,
        error: fetchError,
        duration: `${duration}ms`,
      },
      '❌ Page fetch failed'
    )

    return {
      articles: [],
      success: false,
      error: fetchError,
      debugHtml: null,
      method: fetcherName,
      duration,
    }
  }

  // 3. Parse HTML and extract articles
  const $ = cheerio.load(html)
  let articles = []

  try {
    if (source.extractionMethod === 'json-ld') {
      articles = extractFromJsonLd($, source)
    } else {
      // 'declarative' or 'custom'
      articles = extractFromSelectors($, source)
    }
  } catch (error) {
    logger.error(
      {
        source: source.name,
        method: source.extractionMethod,
        err: error.message,
      },
      'Article extraction failed'
    )
  }

  // 4. Deduplicate articles by URL (final safety check)
  const uniqueArticles = Array.from(new Map(articles.map((a) => [a.link, a])).values())

  const duration = Date.now() - startTime

  // 5. Handle extraction failure
  if (uniqueArticles.length === 0) {
    const debugPath = await saveDebugHtml(`${source.name}_headline_fail`, html, {
      source: source.name,
      url: source.sectionUrl,
      method: source.extractionMethod,
      selectors: source.headlineSelector,
      timestamp: new Date().toISOString(),
      error: 'Extracted 0 headlines',
    })

    logger.error(
      {
        source: source.name,
        debugPath,
        duration: `${duration}ms`,
      },
      '❌ Extracted 0 headlines'
    )

    return {
      articles: [],
      success: false,
      error: 'Extracted 0 headlines.',
      debugHtml: html,
      method: fetcherName,
      duration,
    }
  }

  // 6. Success!
  logger.info(
    {
      source: source.name,
      count: uniqueArticles.length,
      method: source.extractionMethod,
      duration: `${duration}ms`,
    },
    '✅ HTML scrape successful'
  )

  return {
    articles: uniqueArticles,
    success: true,
    resultCount: uniqueArticles.length,
    error: null,
    method: fetcherName,
    duration,
  }
}
