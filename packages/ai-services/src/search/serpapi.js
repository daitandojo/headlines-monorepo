// packages/ai-services/src/search/serpapi.js (version 2.0.0)
import { getJson } from 'serpapi'
import { env } from '@headlines/config'
import { logger } from '@headlines/utils-shared'

/**
 * Configuration for SerpAPI and caching
 */
const SERPAPI_CONFIG = {
  CACHE_TTL: 1000 * 60 * 60, // 1 hour
  CACHE_MAX_SIZE: 1000, // Maximum cache entries
  DEFAULT_LOCATION: 'United States',
  DEFAULT_COUNTRY: 'us',
  DEFAULT_LANGUAGE: 'en',
  MAX_RESULTS: 5,
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 2,
}

/**
 * In-memory cache with LRU-style eviction
 */
class SearchCache {
  constructor(maxSize = SERPAPI_CONFIG.CACHE_MAX_SIZE, ttl = SERPAPI_CONFIG.CACHE_TTL) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
    this.hits = 0
    this.misses = 0
  }

  /**
   * Generates a cache key from query and options
   */
  generateKey(query, options = {}) {
    const normalizedQuery = query.toLowerCase().trim()
    const optionsKey = JSON.stringify({
      location: options.location,
      gl: options.gl,
      hl: options.hl,
    })
    return `serpapi_${normalizedQuery}_${optionsKey}`
  }

  /**
   * Gets a value from cache if valid
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.misses++
      return null
    }

    const cached = this.cache.get(key)

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    // Move to end (LRU behavior)
    this.cache.delete(key)
    this.cache.set(key, cached)
    this.hits++

    return cached.data
  }

  /**
   * Sets a value in cache with LRU eviction
   */
  set(key, data) {
    // If at capacity, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)

      logger.debug(
        { evicted: firstKey, size: this.cache.size },
        'Cache eviction occurred'
      )
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  /**
   * Clears expired entries from cache
   */
  prune() {
    const now = Date.now()
    let pruned = 0

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key)
        pruned++
      }
    }

    if (pruned > 0) {
      logger.debug({ pruned, remaining: this.cache.size }, 'Cache pruned expired entries')
    }

    return pruned
  }

  /**
   * Gets cache statistics
   */
  getStats() {
    const total = this.hits + this.misses
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(2) : 0

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
      ttl: this.ttl,
    }
  }

  /**
   * Clears the entire cache
   */
  clear() {
    const size = this.cache.size
    this.cache.clear()
    this.hits = 0
    this.misses = 0

    logger.info({ cleared: size }, 'Cache cleared')
  }
}

// Initialize cache
const searchCache = new SearchCache()

// Periodic cache pruning (every 15 minutes)
setInterval(
  () => {
    searchCache.prune()
  },
  15 * 60 * 1000
)

/**
 * Validates and sanitizes search query
 * @param {string} query - Raw search query
 * @returns {string|null} Sanitized query or null if invalid
 */
function sanitizeQuery(query) {
  if (!query || typeof query !== 'string') {
    return null
  }

  const sanitized = query
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 500) // Limit length

  return sanitized.length > 0 ? sanitized : null
}

/**
 * Normalizes a search result item
 * @param {Object} item - Raw result item from SerpAPI
 * @returns {Object|null} Normalized result or null if invalid
 */
function normalizeResult(item) {
  if (!item) return null

  const title = item.title || item.question || 'Untitled'
  const link = item.link || item.source_link || null
  const snippet = item.snippet || item.answer || item.result || item.description || null

  // Must have at least a snippet and title
  if (!snippet || !title) {
    return null
  }

  return {
    title: title.trim(),
    link,
    snippet: snippet.trim(),
    source: 'Google Search',
    position: item.position || null,
    date: item.date || null,
  }
}

/**
 * Executes SerpAPI search with timeout and retry logic
 * @param {Object} params - Search parameters
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Object>} Search response
 */
async function executeSerpApiSearch(params, retryCount = 0) {
  try {
    // Wrap in timeout promise
    const response = await Promise.race([
      getJson(params),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Request timeout')),
          SERPAPI_CONFIG.REQUEST_TIMEOUT
        )
      ),
    ])

    return response
  } catch (error) {
    const isRetryable =
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET' ||
      error.message?.includes('timeout') ||
      error.message?.includes('network')

    if (isRetryable && retryCount < SERPAPI_CONFIG.MAX_RETRIES) {
      const delay = 1000 * Math.pow(2, retryCount)

      logger.warn(
        {
          attempt: retryCount + 1,
          maxRetries: SERPAPI_CONFIG.MAX_RETRIES,
          delay: `${delay}ms`,
          err: error.message,
        },
        'SerpAPI request failed, retrying...'
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
      return executeSerpApiSearch(params, retryCount + 1)
    }

    throw error
  }
}

/**
 * Performs a Google search using SerpAPI
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results with success status
 */
export async function getGoogleSearchResults(query, options = {}) {
  const startTime = Date.now()

  // Check API key
  if (!env.SERPAPI_API_KEY) {
    logger.warn('SERPAPI_API_KEY is not configured. Skipping web search.')
    return {
      success: true,
      results: [],
      cached: false,
      error: 'API key not configured',
    }
  }

  // Validate query
  const sanitizedQuery = sanitizeQuery(query)

  if (!sanitizedQuery) {
    logger.warn({ query }, 'Invalid query provided for SerpAPI search')
    return {
      success: false,
      error: 'Query is required and must be a non-empty string.',
      results: [],
    }
  }

  // Check cache
  const cacheKey = searchCache.generateKey(sanitizedQuery, options)
  const cachedResult = searchCache.get(cacheKey)

  if (cachedResult) {
    const duration = Date.now() - startTime

    logger.info(
      {
        query: sanitizedQuery,
        duration: `${duration}ms`,
        stats: searchCache.getStats(),
      },
      'SerpAPI cache hit'
    )

    return {
      ...cachedResult,
      cached: true,
    }
  }

  // Perform live search
  logger.info({ query: sanitizedQuery }, 'SerpAPI performing live search')

  try {
    const searchParams = {
      api_key: env.SERPAPI_API_KEY,
      engine: 'google',
      q: sanitizedQuery,
      location: options.location || SERPAPI_CONFIG.DEFAULT_LOCATION,
      gl: options.country || SERPAPI_CONFIG.DEFAULT_COUNTRY,
      hl: options.language || SERPAPI_CONFIG.DEFAULT_LANGUAGE,
      num: options.numResults || SERPAPI_CONFIG.MAX_RESULTS,
      ...options.additionalParams,
    }

    const response = await executeSerpApiSearch(searchParams)

    // Extract and normalize results
    const organicResults = response.organic_results || []
    const answerBox = response.answer_box ? [response.answer_box] : []
    const knowledgeGraph = response.knowledge_graph ? [response.knowledge_graph] : []

    // Combine all result types
    const allResults = [...answerBox, ...knowledgeGraph, ...organicResults]

    const formattedResults = allResults
      .map(normalizeResult)
      .filter(Boolean)
      .slice(0, options.maxResults || SERPAPI_CONFIG.MAX_RESULTS)

    const duration = Date.now() - startTime

    const result = {
      success: true,
      results: formattedResults,
      cached: false,
      metadata: {
        query: sanitizedQuery,
        resultCount: formattedResults.length,
        duration,
        searchInfo: response.search_information || null,
      },
    }

    // Cache successful result
    searchCache.set(cacheKey, result)

    logger.info(
      {
        query: sanitizedQuery,
        results: formattedResults.length,
        duration: `${duration}ms`,
      },
      'SerpAPI search completed successfully'
    )

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    logger.error(
      {
        query: sanitizedQuery,
        err: error.message || error,
        duration: `${duration}ms`,
      },
      'SerpAPI search failed'
    )

    return {
      success: false,
      error: `Failed to fetch search results: ${error.message}`,
      results: [],
      cached: false,
    }
  }
}

/**
 * Gets cache statistics for monitoring
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  return searchCache.getStats()
}

/**
 * Clears the search cache
 * @returns {void}
 */
export function clearCache() {
  searchCache.clear()
}

/**
 * Manually prunes expired cache entries
 * @returns {number} Number of entries pruned
 */
export function pruneCache() {
  return searchCache.prune()
}

/**
 * Health check for SerpAPI
 * @returns {Promise<Object>} API health status
 */
export async function checkApiHealth() {
  if (!env.SERPAPI_API_KEY) {
    return {
      configured: false,
      operational: false,
      error: 'API key not configured',
    }
  }

  try {
    const result = await getGoogleSearchResults('test', { numResults: 1 })

    return {
      configured: true,
      operational: result.success,
      error: result.error || null,
    }
  } catch (error) {
    return {
      configured: true,
      operational: false,
      error: error.message,
    }
  }
}
