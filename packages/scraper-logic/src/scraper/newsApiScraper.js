// packages/scraper-logic/src/scraper/newsApiScraper.js (version 3.0.0)
import NewsAPI from 'newsapi'
import { getConfig } from '../config.js'
import { Source, WatchlistEntity } from '../../../models/src/index.js'
import { env } from '../../../config/src/index.js'
import colors from 'ansi-colors'

/**
 * Configuration constants for NewsAPI
 */
const NEWSAPI_CONFIG = {
  MAX_QUERY_LENGTH: 490, // NewsAPI query length limit
  MAX_QUERIES_PER_REQUEST: 4, // Rate limit protection
  DEFAULT_LANGUAGES: 'en,da,sv,no',
  DEFAULT_PAGE_SIZE: 100,
  DEFAULT_TIME_WINDOW_HOURS: 24,
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 2,
}

/**
 * Fetches and combines watchlist from active sources and entities
 * @returns {Promise<string[]>} Array of unique watchlist keywords
 */
async function getWatchlist() {
  const logger = getConfig().logger
  const startTime = Date.now()

  try {
    const [sources, richListTargets] = await Promise.all([
      Source.find({
        status: 'active',
        country: { $in: ['Denmark', 'Global PE', 'M&A Aggregators'] },
      })
        .select('name')
        .lean()
        .maxTimeMS(10000), // 10 second timeout

      WatchlistEntity.find({ status: 'active' }).select('name').lean().maxTimeMS(10000),
    ])

    // Extract and clean names
    const sourceNames = sources.map((s) => s.name.split('(')[0].trim()).filter(Boolean)

    const richListNames = richListTargets
      .map((t) => t.name.split('(')[0].trim())
      .filter(Boolean)

    // Combine and deduplicate
    const watchlist = [...new Set([...sourceNames, ...richListNames])].sort() // Alphabetical sort for consistent query generation

    const duration = Date.now() - startTime

    logger.info(
      {
        sources: sourceNames.length,
        entities: richListNames.length,
        total: watchlist.length,
        duration: `${duration}ms`,
      },
      'Watchlist compiled successfully'
    )

    logger.trace({ keywords: watchlist }, 'Full NewsAPI watchlist keywords')

    return watchlist
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch watchlist from database')
    throw error
  }
}

/**
 * Sanitizes a keyword for use in NewsAPI queries
 * @param {string} keyword - Raw keyword
 * @returns {string} Sanitized and quoted keyword
 */
function sanitizeKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') return null

  return keyword
    .replace(/&/g, ' ') // Replace ampersands
    .replace(/[()]/g, '') // Remove parentheses
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Builds optimized query batches from watchlist keywords
 * Respects NewsAPI query length limits and rate limiting
 * @param {string[]} watchlist - Array of keywords
 * @param {number} maxQueryLength - Maximum query length
 * @param {number} maxQueries - Maximum number of queries to return
 * @returns {string[]} Array of query strings
 */
function buildQueryBatches(
  watchlist,
  maxQueryLength = NEWSAPI_CONFIG.MAX_QUERY_LENGTH,
  maxQueries = NEWSAPI_CONFIG.MAX_QUERIES_PER_REQUEST
) {
  const logger = getConfig().logger
  const queries = []
  let currentBatch = []
  let skippedKeywords = []

  for (const keyword of watchlist) {
    const sanitizedKeyword = sanitizeKeyword(keyword)

    if (!sanitizedKeyword) {
      skippedKeywords.push(keyword)
      continue
    }

    const quotedKeyword = `"${sanitizedKeyword}"`

    // Check if adding this keyword would exceed the limit
    const potentialQuery = [...currentBatch, quotedKeyword].join(' OR ')

    if (potentialQuery.length > maxQueryLength) {
      // Save current batch if it has content
      if (currentBatch.length > 0) {
        queries.push(currentBatch.join(' OR '))
      }

      // Start new batch with current keyword
      // If single keyword is too long, truncate it
      if (quotedKeyword.length > maxQueryLength) {
        const truncated = `"${sanitizedKeyword.substring(0, maxQueryLength - 3)}"`
        logger.warn({ original: keyword, truncated }, 'Keyword too long, truncated')
        currentBatch = [truncated]
      } else {
        currentBatch = [quotedKeyword]
      }
    } else {
      currentBatch.push(quotedKeyword)
    }
  }

  // Add final batch
  if (currentBatch.length > 0) {
    queries.push(currentBatch.join(' OR '))
  }

  // Log skipped keywords
  if (skippedKeywords.length > 0) {
    logger.debug(
      { count: skippedKeywords.length, keywords: skippedKeywords },
      'Skipped invalid keywords'
    )
  }

  // Handle query limit
  const queriesToUse = queries.slice(0, maxQueries)
  const skippedQueries = queries.slice(maxQueries)

  if (skippedQueries.length > 0) {
    logger.warn(
      {
        total: queries.length,
        used: queriesToUse.length,
        skipped: skippedQueries.length,
      },
      `Watchlist generated ${queries.length} queries, using first ${maxQueries} to avoid rate limits`
    )

    // Visual breakdown of queries
    let logMessage = '[NewsAPI] Query Breakdown:\n'
    queries.forEach((q, i) => {
      const inUse = i < maxQueries
      const status = inUse ? colors.green('✓ IN USE') : colors.gray('✗ SKIPPED')
      const preview = q.length > 100 ? q.substring(0, 97) + '...' : q
      logMessage += `  ${status} Query ${i + 1} (${q.length} chars): ${preview}\n`
    })
    logger.info(logMessage)
  } else {
    logger.info(
      { count: queriesToUse.length },
      `Built ${queriesToUse.length} optimized queries`
    )
  }

  return queriesToUse
}

/**
 * Executes a single NewsAPI query with retry logic
 * @param {NewsAPI} newsapi - NewsAPI client instance
 * @param {Object} params - Query parameters
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Object>} API response
 */
async function executeQuery(newsapi, params, retryCount = 0) {
  const logger = getConfig().logger

  try {
    const response = await Promise.race([
      newsapi.v2.everything(params),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Request timeout')),
          NEWSAPI_CONFIG.REQUEST_TIMEOUT
        )
      ),
    ])

    return response
  } catch (error) {
    if (retryCount < NEWSAPI_CONFIG.MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff

      logger.warn(
        {
          attempt: retryCount + 1,
          maxRetries: NEWSAPI_CONFIG.MAX_RETRIES,
          delay: `${delay}ms`,
          err: error.message,
        },
        'Query failed, retrying...'
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
      return executeQuery(newsapi, params, retryCount + 1)
    }

    throw error
  }
}

/**
 * Normalizes and validates article data from NewsAPI response
 * @param {Object} rawArticle - Raw article from NewsAPI
 * @returns {Object|null} Normalized article or null if invalid
 */
function normalizeArticle(rawArticle) {
  if (!rawArticle?.title || !rawArticle?.url) {
    return null
  }

  // Filter out removed/deleted articles
  if (rawArticle.title === '[Removed]' || rawArticle.url.includes('removed')) {
    return null
  }

  return {
    headline: rawArticle.title.trim(),
    link: rawArticle.url,
    source: rawArticle.source?.name || 'Unknown',
    newspaper: rawArticle.source?.name || 'Unknown',
    description: rawArticle.description || null,
    publishedAt: rawArticle.publishedAt || null,
    author: rawArticle.author || null,
    imageUrl: rawArticle.urlToImage || null,
  }
}

/**
 * Main function to scrape articles from NewsAPI
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Array of unique articles
 */
export async function scrapeNewsAPI(options = {}) {
  const logger = getConfig().logger
  const startTime = Date.now()

  // Validate API key
  if (!env.NEWSAPI_API_KEY) {
    logger.error('NEWSAPI_API_KEY is not configured')
    return []
  }

  const newsapi = new NewsAPI(env.NEWSAPI_API_KEY)

  // Merge options with defaults
  const config = {
    languages: options.languages || NEWSAPI_CONFIG.DEFAULT_LANGUAGES,
    pageSize: options.pageSize || NEWSAPI_CONFIG.DEFAULT_PAGE_SIZE,
    timeWindowHours: options.timeWindowHours || NEWSAPI_CONFIG.DEFAULT_TIME_WINDOW_HOURS,
    maxQueries: options.maxQueries || NEWSAPI_CONFIG.MAX_QUERIES_PER_REQUEST,
  }

  try {
    // 1. Build watchlist and queries
    logger.info('📰 Starting NewsAPI scrape')

    const watchlist = await getWatchlist()

    if (watchlist.length === 0) {
      logger.warn('Watchlist is empty, skipping NewsAPI scrape')
      return []
    }

    const queryBatches = buildQueryBatches(
      watchlist,
      NEWSAPI_CONFIG.MAX_QUERY_LENGTH,
      config.maxQueries
    )

    if (queryBatches.length === 0) {
      logger.warn('No valid queries generated from watchlist')
      return []
    }

    logger.info(
      { queries: queryBatches.length },
      `Dispatching ${queryBatches.length} batched queries`
    )

    // 2. Calculate time window
    const fromDate = new Date(
      Date.now() - config.timeWindowHours * 60 * 60 * 1000
    ).toISOString()

    // 3. Execute all queries with retry logic
    const queryPromises = queryBatches.map((query, index) =>
      executeQuery(newsapi, {
        q: query,
        language: config.languages,
        sortBy: 'publishedAt',
        from: fromDate,
        pageSize: config.pageSize,
      }).catch((error) => {
        logger.error(
          {
            queryIndex: index + 1,
            err: error.message,
          },
          'Query execution failed'
        )
        return { status: 'error', articles: [], error }
      })
    )

    const allResponses = await Promise.all(queryPromises)

    // 4. Process responses
    let allArticles = []
    let successfulQueries = 0
    let failedQueries = 0

    for (const [index, response] of allResponses.entries()) {
      if (response.status === 'ok') {
        successfulQueries++
        allArticles.push(...response.articles)

        logger.debug(
          {
            query: index + 1,
            articles: response.articles.length,
            totalResults: response.totalResults,
          },
          'Query successful'
        )
      } else {
        failedQueries++
        logger.error(
          {
            query: index + 1,
            code: response.code,
            message: response.message,
          },
          'Query returned error status'
        )
      }
    }

    // 5. Normalize and deduplicate articles
    const normalizedArticles = allArticles.map(normalizeArticle).filter(Boolean)

    const uniqueArticles = Array.from(
      new Map(normalizedArticles.map((a) => [a.link, a])).values()
    )

    const duration = Date.now() - startTime

    // 6. Log results
    if (uniqueArticles.length === 0) {
      logger.info(
        {
          duration: `${duration}ms`,
          queries: { successful: successfulQueries, failed: failedQueries },
        },
        'No new articles found matching watchlist'
      )
      return []
    }

    logger.info(
      {
        articles: {
          raw: allArticles.length,
          normalized: normalizedArticles.length,
          unique: uniqueArticles.length,
        },
        queries: { successful: successfulQueries, failed: failedQueries },
        duration: `${duration}ms`,
      },
      `✅ NewsAPI scrape completed: ${uniqueArticles.length} unique articles`
    )

    return uniqueArticles
  } catch (error) {
    const duration = Date.now() - startTime

    // Handle specific error types
    if (error.name?.includes('rateLimited') || error.code === 'rateLimited') {
      logger.warn(
        { duration: `${duration}ms` },
        'NewsAPI rate limit reached (expected on free tier). Some watchlist items may have been missed.'
      )
    } else if (error.code === 'apiKeyInvalid') {
      logger.error('NewsAPI key is invalid or expired')
    } else if (error.code === 'parametersMissing') {
      logger.error({ err: error }, 'Invalid query parameters')
    } else {
      logger.error(
        { err: error, duration: `${duration}ms` },
        'Critical error during NewsAPI scraping'
      )
    }

    return []
  }
}
