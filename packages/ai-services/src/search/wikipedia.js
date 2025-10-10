// packages/ai-services/src/search/wikipedia.js
import { logger, apiCallTracker } from '@headlines/utils-shared'
import { settings } from '@headlines/config'
import { disambiguationChain } from '../chains/index.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { disambiguationSchema } from '@headlines/models/schemas'

/**
 * Wikipedia API configuration
 */
const WIKIPEDIA_CONFIG = {
  API_ENDPOINT: 'https://en.wikipedia.org/w/api.php',
  SUMMARY_LENGTH: 750,
  MAX_SEARCH_RESULTS: 5,
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 2,
  USER_AGENT: 'HeadlinesBot/1.0 (Educational; https://headlines.app)',
  MIN_SUMMARY_LENGTH: 100, // Minimum viable summary length
  CACHE_TTL: 1000 * 60 * 60 * 24, // 24 hours
  MAX_CACHE_SIZE: 500,
}

/**
 * Simple in-memory cache for Wikipedia results
 */
class WikipediaCache {
  constructor(
    maxSize = WIKIPEDIA_CONFIG.MAX_CACHE_SIZE,
    ttl = WIKIPEDIA_CONFIG.CACHE_TTL
  ) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
  }

  generateKey(query) {
    return `wiki_${query.toLowerCase().trim()}`
  }

  get(query) {
    const key = this.generateKey(query)

    if (!this.cache.has(key)) {
      return null
    }

    const cached = this.cache.get(key)

    // Check expiration
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  set(query, data) {
    // LRU eviction if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    const key = this.generateKey(query)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  clear() {
    this.cache.clear()
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
    }
  }
}

const wikipediaCache = new WikipediaCache()

/**
 * Validates and sanitizes Wikipedia query
 * @param {string} query - Raw query
 * @returns {string|null} Sanitized query or null if invalid
 */
function sanitizeQuery(query) {
  if (!query || typeof query !== 'string') {
    return null
  }

  const sanitized = query.trim().replace(/\s+/g, ' ').substring(0, 300) // Limit length

  return sanitized.length > 0 ? sanitized : null
}

/**
 * Fetches a URL with retry logic and exponential backoff
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithRetry(
  url,
  options = {},
  maxRetries = WIKIPEDIA_CONFIG.MAX_RETRIES
) {
  const fetchOptions = {
    ...options,
    headers: {
      'User-Agent': WIKIPEDIA_CONFIG.USER_AGENT,
      ...options.headers,
    },
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await Promise.race([
        fetch(url, fetchOptions),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Request timeout')),
            WIKIPEDIA_CONFIG.REQUEST_TIMEOUT
          )
        ),
      ])

      if (!response.ok) {
        throw new Error(`Wikipedia API returned status ${response.status}`)
      }

      return response
    } catch (error) {
      const isLastAttempt = attempt === maxRetries
      const isRetryable =
        error.message?.includes('timeout') ||
        error.message?.includes('network') ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET'

      if (!isRetryable || isLastAttempt) {
        logger.error(
          {
            url,
            attempt,
            err: error.message,
          },
          'Wikipedia fetch failed'
        )
        throw error
      }

      const delay = 1000 * Math.pow(2, attempt - 1)

      logger.warn(
        {
          url,
          attempt,
          maxRetries,
          delay: `${delay}ms`,
          err: error.message,
        },
        'Wikipedia fetch failed, retrying...'
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

/**
 * Searches Wikipedia for matching articles
 * @param {string} query - Search query
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Search results
 */
async function searchWikipedia(query, limit = WIKIPEDIA_CONFIG.MAX_SEARCH_RESULTS) {
  const searchParams = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: String(limit),
    format: 'json',
    origin: '*',
  })

  const url = `${WIKIPEDIA_CONFIG.API_ENDPOINT}?${searchParams.toString()}`

  const response = await fetchWithRetry(url)
  const data = await response.json()

  const results = data.query?.search || []

  if (results.length === 0) {
    throw new Error(`No Wikipedia search results found for "${query}"`)
  }

  return results
}

/**
 * Fetches article summary from Wikipedia
 * @param {string} title - Article title
 * @returns {Promise<Object>} Article summary and metadata
 */
async function fetchArticleSummary(title) {
  const summaryParams = new URLSearchParams({
    action: 'query',
    prop: 'extracts|info|pageimages',
    exintro: 'true',
    explaintext: 'true',
    titles: title,
    format: 'json',
    redirects: '1',
    inprop: 'url',
    piprop: 'thumbnail',
    pithumbsize: '300',
    origin: '*',
  })

  const url = `${WIKIPEDIA_CONFIG.API_ENDPOINT}?${summaryParams.toString()}`

  const response = await fetchWithRetry(url)
  const data = await response.json()

  const pages = data.query?.pages

  if (!pages) {
    throw new Error(`No page data returned for "${title}"`)
  }

  const pageId = Object.keys(pages)[0]
  const page = pages[pageId]

  // Check for missing page
  if (pageId === '-1' || page.missing) {
    throw new Error(`Wikipedia page not found for "${title}"`)
  }

  const summary = page.extract

  if (!summary) {
    throw new Error(`Could not extract summary for page "${title}"`)
  }

  return {
    title: page.title,
    summary,
    url: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    thumbnail: page.thumbnail?.source || null,
    pageId: page.pageid,
  }
}

/**
 * Uses AI to disambiguate between multiple Wikipedia search results
 * @param {string} query - Original query
 * @param {Array} searchResults - Search results to disambiguate
 * @returns {Promise<string|null>} Best matching title or null
 */
async function disambiguateResults(query, searchResults) {
  if (searchResults.length === 1) {
    return searchResults[0].title
  }

  try {
    const userContent = `Original Query: "${query}"\n\nSearch Results:\n${JSON.stringify(
      searchResults.map((r) => ({
        title: r.title,
        snippet: r.snippet?.replace(/<[^>]*>/g, '') || '', // Strip HTML tags
      }))
    )}`

    logger.debug(
      {
        query,
        candidates: searchResults.length,
      },
      'Attempting AI disambiguation'
    )

    const disambiguationResponse = await disambiguationChain({ inputText: userContent })

    if (
      disambiguationResponse &&
      !disambiguationResponse.error &&
      disambiguationResponse.best_title
    ) {
      logger.info(
        {
          query,
          selected: disambiguationResponse.best_title,
          confidence: disambiguationResponse.confidence || 'unknown',
        },
        'AI disambiguation successful'
      )

      return disambiguationResponse.best_title
    }

    logger.debug({ query }, 'AI disambiguation returned no result')
    return null
  } catch (error) {
    logger.warn(
      {
        err: error.message,
        query,
      },
      'AI disambiguation failed'
    )
    return null
  }
}

/**
 * Fetches Wikipedia summary with intelligent disambiguation
 * @param {string} query - Search query
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Summary result with metadata
 */
export async function fetchWikipediaSummary(query, options = {}) {
  const startTime = Date.now()

  // Validate query
  const sanitizedQuery = sanitizeQuery(query)

  if (!sanitizedQuery) {
    logger.warn({ query }, 'Invalid Wikipedia query provided')
    return {
      success: false,
      error: 'Query cannot be empty or invalid.',
      query,
    }
  }

  // Check cache
  const cached = wikipediaCache.get(sanitizedQuery)

  if (cached && !options.skipCache) {
    const duration = Date.now() - startTime

    logger.debug(
      {
        query: sanitizedQuery,
        duration: `${duration}ms`,
      },
      'Wikipedia cache hit'
    )

    return {
      ...cached,
      cached: true,
    }
  }

  try {
    apiCallTracker.recordCall('wikipedia')

    // 1. Search for articles
    const searchResults = await searchWikipedia(
      sanitizedQuery,
      options.searchLimit || WIKIPEDIA_CONFIG.MAX_SEARCH_RESULTS
    )

    logger.debug(
      {
        query: sanitizedQuery,
        results: searchResults.length,
      },
      'Wikipedia search completed'
    )

    // 2. Disambiguate (if needed)
    let bestTitle = null

    if (options.useDisambiguation !== false) {
      bestTitle = await disambiguateResults(sanitizedQuery, searchResults)
    }

    // 3. Fallback to first result if disambiguation fails
    if (!bestTitle) {
      bestTitle = searchResults[0].title

      logger.info(
        {
          query: sanitizedQuery,
          fallback: bestTitle,
        },
        'Using top search result (disambiguation unavailable or failed)'
      )
    }

    // 4. Fetch article summary
    const article = await fetchArticleSummary(bestTitle)

    // 5. Validate content quality
    const validation = await validateWikipediaContent(article.summary)

    if (!validation.valid) {
      logger.warn(
        {
          query: sanitizedQuery,
          title: bestTitle,
          reason: validation.reason,
        },
        'Wikipedia content validation failed'
      )

      // Try second result if available
      if (searchResults.length > 1) {
        logger.info('Attempting second search result...')
        const secondTitle = searchResults[1].title
        const secondArticle = await fetchArticleSummary(secondTitle)
        const secondValidation = await validateWikipediaContent(secondArticle.summary)

        if (secondValidation.valid) {
          Object.assign(article, secondArticle)
        }
      }
    }

    // 6. Truncate summary if needed
    const summaryLength = options.summaryLength || WIKIPEDIA_CONFIG.SUMMARY_LENGTH
    const conciseSummary =
      article.summary.length > summaryLength
        ? article.summary.substring(0, summaryLength) + '...'
        : article.summary

    const duration = Date.now() - startTime

    const result = {
      success: true,
      summary: conciseSummary,
      fullSummary: article.summary,
      title: article.title,
      url: article.url,
      thumbnail: article.thumbnail,
      query: sanitizedQuery,
      quality: validation.quality,
      cached: false,
      metadata: {
        duration,
        pageId: article.pageId,
        searchResults: searchResults.length,
        disambiguated: !!options.useDisambiguation,
      },
    }

    // Cache successful result
    wikipediaCache.set(sanitizedQuery, result)

    logger.info(
      {
        query: sanitizedQuery,
        title: article.title,
        summaryLength: conciseSummary.length,
        duration: `${duration}ms`,
      },
      'Wikipedia summary fetched successfully'
    )

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    logger.warn(
      {
        query: sanitizedQuery,
        err: error.message,
        duration: `${duration}ms`,
      },
      'Wikipedia lookup failed'
    )

    return {
      success: false,
      error: error.message,
      query: sanitizedQuery,
      cached: false,
    }
  }
}

/**
 * Fetches Wikipedia summaries for multiple queries in parallel
 * @param {string[]} queries - Array of search queries
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Array of summary results
 */
export async function fetchBatchWikipediaSummaries(queries, options = {}) {
  if (!Array.isArray(queries) || queries.length === 0) {
    logger.warn('Invalid or empty queries array provided for batch fetch')
    return []
  }

  const startTime = Date.now()

  logger.info({ count: queries.length }, 'Starting batch Wikipedia fetch')

  const promises = queries.map((query) =>
    fetchWikipediaSummary(query, options).catch((error) => ({
      success: false,
      error: error.message,
      query,
    }))
  )

  const results = await Promise.all(promises)

  const duration = Date.now() - startTime
  const successful = results.filter((r) => r.success).length
  const failed = results.length - successful

  logger.info(
    {
      total: results.length,
      successful,
      failed,
      duration: `${duration}ms`,
    },
    'Batch Wikipedia fetch completed'
  )

  return results
}

/**
 * Validates Wikipedia content quality
 * @param {string} text - Wikipedia article text
 * @returns {Promise<Object>} Validation result
 */
export async function validateWikipediaContent(text) {
  if (!text || typeof text !== 'string') {
    return {
      valid: false,
      quality: 'low',
      reason: 'Content is empty or invalid',
    }
  }

  const lowerText = text.toLowerCase()

  // Check for disambiguation pages
  const isDisambiguation =
    lowerText.includes('may refer to:') ||
    lowerText.includes('is a list of') ||
    lowerText.includes('disambiguation)')

  if (isDisambiguation) {
    return {
      valid: false,
      quality: 'low',
      reason: 'Disambiguation page content detected',
    }
  }

  // Check for list pages (often low quality for summaries)
  const isListPage =
    lowerText.startsWith('this is a list') || lowerText.startsWith('list of')

  if (isListPage) {
    return {
      valid: false,
      quality: 'low',
      reason: 'List page content detected',
    }
  }

  // Check minimum length
  if (text.length < WIKIPEDIA_CONFIG.MIN_SUMMARY_LENGTH) {
    return {
      valid: false,
      quality: 'low',
      reason: `Summary too short (${text.length} chars, minimum ${WIKIPEDIA_CONFIG.MIN_SUMMARY_LENGTH})`,
    }
  }

  // Check for stub articles
  const isStub = lowerText.includes('stub') && text.length < 500

  if (isStub) {
    return {
      valid: true,
      quality: 'medium',
      reason: 'Stub article detected',
    }
  }

  return {
    valid: true,
    quality: 'high',
    reason: 'Content appears to be a valid, substantive summary',
  }
}

/**
 * Gets cache statistics
 * @returns {Object} Cache statistics
 */
export function getWikipediaCacheStats() {
  return wikipediaCache.getStats()
}

/**
 * Clears the Wikipedia cache
 * @returns {void}
 */
export function clearCache() {
  wikipediaCache.clear()
  logger.info('Wikipedia cache cleared')
}

/**
 * Health check for Wikipedia API
 * @returns {Promise<Object>} API health status
 */
export async function checkWikipediaApiHealth() {
  try {
    const result = await fetchWikipediaSummary('Wikipedia', {
      skipCache: true,
      useDisambiguation: false,
    })

    return {
      operational: result.success,
      error: result.error || null,
      responseTime: result.metadata?.duration || null,
    }
  } catch (error) {
    return {
      operational: false,
      error: error.message,
      responseTime: null,
    }
  }
}
