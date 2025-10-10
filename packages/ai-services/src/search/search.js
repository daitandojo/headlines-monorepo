// packages/ai-services/src/search/search.js
import axios from 'axios'
import NewsAPI from 'newsapi'
import { env } from '@headlines/config'
import { logger, apiCallTracker } from '@headlines/utils-shared'

const { SERPER_API_KEY, NEWSAPI_API_KEY } = env

/**
 * API configuration constants
 */
const API_CONFIG = {
  SERPER: {
    BASE_URL: 'https://google.serper.dev',
    TIMEOUT: 30000,
    MAX_RETRIES: 2,
    DEFAULT_RESULTS: 5,
  },
  NEWSAPI: {
    TIMEOUT: 30000,
    MAX_RETRIES: 2,
    DEFAULT_PAGE_SIZE: 5,
    DEFAULT_LANGUAGES: 'en,da,sv,no',
  },
}

/**
 * Initialize Serper API client with proper configuration
 */
const serperClient = SERPER_API_KEY
  ? axios.create({
      baseURL: API_CONFIG.SERPER.BASE_URL,
      timeout: API_CONFIG.SERPER.TIMEOUT,
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    })
  : null

/**
 * Initialize NewsAPI client
 */
const newsapi = NEWSAPI_API_KEY ? new NewsAPI(NEWSAPI_API_KEY) : null

// Log API availability on initialization
if (!serperClient) {
  logger.warn('SERPER_API_KEY not configured. Google Search features will be disabled.')
}

if (!newsapi) {
  logger.warn('NEWSAPI_API_KEY not configured. NewsAPI features will be disabled.')
}

/**
 * Determines if an error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} True if the error should trigger a retry
 */
function isRetryableError(error) {
  // Network errors
  if (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND'
  ) {
    return true
  }

  // 5xx server errors
  if (error.response && error.response.status >= 500) {
    return true
  }

  // Rate limiting (429) - worth retrying after backoff
  if (error.response && error.response.status === 429) {
    return true
  }

  return false
}

/**
 * Executes an API call with automatic retry logic and exponential backoff
 * @param {Function} apiCall - Async function that performs the API call
 * @param {string} serviceName - Name of the service for logging
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Object>} API response or error object
 */
async function withRetry(
  apiCall,
  serviceName,
  maxRetries = API_CONFIG.SERPER.MAX_RETRIES
) {
  const startTime = Date.now()

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall()

      if (attempt > 1) {
        const duration = Date.now() - startTime
        logger.info(
          {
            service: serviceName,
            attempt,
            duration: `${duration}ms`,
          },
          'API call succeeded after retry'
        )
      }

      return result
    } catch (error) {
      const isLastAttempt = attempt === maxRetries
      const shouldRetry = isRetryableError(error)

      // Log the error with context
      const errorContext = {
        service: serviceName,
        attempt,
        maxRetries,
        status: error.response?.status,
        code: error.code,
        message: error.message,
      }

      if (!shouldRetry || isLastAttempt) {
        const duration = Date.now() - startTime

        logger.error(
          {
            ...errorContext,
            duration: `${duration}ms`,
            err: error.response?.data || error,
          },
          `${serviceName} API call failed${isLastAttempt && shouldRetry ? ' after retries' : ''}`
        )

        return {
          success: false,
          error: error.message,
          errorCode: error.response?.status || error.code,
          results: [],
        }
      }

      // Calculate exponential backoff delay
      const delay = 1000 * Math.pow(2, attempt - 1)

      logger.warn(
        {
          ...errorContext,
          delay: `${delay}ms`,
        },
        `${serviceName} attempt ${attempt} failed. Retrying...`
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

/**
 * Validates and sanitizes search query
 * @param {string} query - Raw search query
 * @returns {string|null} Sanitized query or null if invalid
 */
function sanitizeQuery(query) {
  if (!query || typeof query !== 'string') {
    return null
  }

  return query
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 500) // Limit length to prevent issues
}

/**
 * Finds alternative news sources for a headline using Serper News API
 * @param {string} headline - Article headline to search for
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results with success status
 */
export async function findAlternativeSources(headline, options = {}) {
  if (!serperClient) {
    return {
      success: false,
      results: [],
      error: 'Serper API not configured',
    }
  }

  const sanitizedQuery = sanitizeQuery(headline)

  if (!sanitizedQuery) {
    logger.warn({ headline }, 'Invalid headline provided for Serper News search')
    return {
      success: false,
      results: [],
      error: 'Invalid search query',
    }
  }

  const startTime = Date.now()

  return withRetry(async () => {
    apiCallTracker.recordCall('serper_news')

    const requestParams = {
      q: sanitizedQuery,
      num: options.numResults || API_CONFIG.SERPER.DEFAULT_RESULTS,
      ...options.additionalParams,
    }

    const response = await serperClient.post('/news', requestParams)

    const duration = Date.now() - startTime
    const results = response.data.news || []

    logger.debug(
      {
        query: sanitizedQuery,
        results: results.length,
        duration: `${duration}ms`,
      },
      'Serper News search completed'
    )

    return {
      success: true,
      results,
      metadata: {
        query: sanitizedQuery,
        resultCount: results.length,
        duration,
      },
    }
  }, 'Serper News')
}

/**
 * Performs a Google search using Serper API
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results with snippets
 */
export async function performGoogleSearch(query, options = {}) {
  if (!serperClient) {
    return {
      success: false,
      snippets: 'SERPER_API_KEY not configured.',
      error: 'API not configured',
    }
  }

  const sanitizedQuery = sanitizeQuery(query)

  if (!sanitizedQuery) {
    logger.warn({ query }, 'Invalid query provided for Google search')
    return {
      success: false,
      snippets: 'Invalid search query.',
      error: 'Invalid query',
    }
  }

  const startTime = Date.now()

  return withRetry(async () => {
    apiCallTracker.recordCall('serper_search')

    const requestParams = {
      q: sanitizedQuery,
      num: options.numResults || API_CONFIG.SERPER.DEFAULT_RESULTS,
      ...options.additionalParams,
    }

    const response = await serperClient.post('/search', requestParams)

    const organicResults = response.data.organic || []
    const duration = Date.now() - startTime

    if (organicResults.length === 0) {
      logger.debug(
        { query: sanitizedQuery, duration: `${duration}ms` },
        'Google search returned no results'
      )

      return {
        success: false,
        snippets: 'No search results found.',
        results: [],
        metadata: {
          query: sanitizedQuery,
          resultCount: 0,
          duration,
        },
      }
    }

    // Format results into snippets
    const maxResults = options.maxSnippets || API_CONFIG.SERPER.DEFAULT_RESULTS
    const snippets = organicResults
      .slice(0, maxResults)
      .map((res, index) => {
        const title = res.title || 'Untitled'
        const snippet = res.snippet || 'No description available'
        return `${index + 1}. ${title}: ${snippet}`
      })
      .join('\n')

    logger.debug(
      {
        query: sanitizedQuery,
        results: organicResults.length,
        duration: `${duration}ms`,
      },
      'Google search completed'
    )

    return {
      success: true,
      snippets,
      results: organicResults.slice(0, maxResults),
      metadata: {
        query: sanitizedQuery,
        resultCount: organicResults.length,
        duration,
      },
    }
  }, 'Serper Search')
}

/**
 * Finds related articles for an event using NewsAPI
 * @param {string} headline - Event headline to search for
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Related articles with snippets
 */
export async function findNewsApiArticlesForEvent(headline, options = {}) {
  if (!newsapi) {
    return {
      success: false,
      snippets: 'NewsAPI key not configured.',
      error: 'API not configured',
    }
  }

  const sanitizedQuery = sanitizeQuery(headline)

  if (!sanitizedQuery) {
    logger.warn({ headline }, 'Invalid headline provided for NewsAPI search')
    return {
      success: false,
      snippets: 'Invalid search query.',
      error: 'Invalid query',
    }
  }

  const startTime = Date.now()

  return withRetry(
    async () => {
      apiCallTracker.recordCall('newsapi_search')

      const queryParams = {
        q: `"${sanitizedQuery}"`,
        pageSize: options.pageSize || API_CONFIG.NEWSAPI.DEFAULT_PAGE_SIZE,
        sortBy: options.sortBy || 'relevancy',
        language: options.languages || API_CONFIG.NEWSAPI.DEFAULT_LANGUAGES,
        ...options.additionalParams,
      }

      const response = await Promise.race([
        newsapi.v2.everything(queryParams),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Request timeout')),
            API_CONFIG.NEWSAPI.TIMEOUT
          )
        ),
      ])

      const duration = Date.now() - startTime
      const articles = response.articles || []

      if (articles.length === 0) {
        logger.debug(
          { query: sanitizedQuery, duration: `${duration}ms` },
          'NewsAPI search returned no results'
        )

        return {
          success: false,
          snippets: 'No related articles found.',
          results: [],
          metadata: {
            query: sanitizedQuery,
            resultCount: 0,
            duration,
          },
        }
      }

      // Format articles into snippets
      const snippets = articles
        .map((article, index) => {
          const title = article.title || 'Untitled'
          const source = article.source?.name || 'Unknown'
          const description = article.description || 'No description'
          return `${index + 1}. ${title} (${source}): ${description}`
        })
        .join('\n')

      logger.debug(
        {
          query: sanitizedQuery,
          results: articles.length,
          duration: `${duration}ms`,
        },
        'NewsAPI search completed'
      )

      return {
        success: true,
        snippets,
        results: articles,
        metadata: {
          query: sanitizedQuery,
          resultCount: articles.length,
          duration,
        },
      }
    },
    'NewsAPI',
    API_CONFIG.NEWSAPI.MAX_RETRIES
  )
}

/**
 * Health check for configured search APIs
 * @returns {Promise<Object>} Status of each API
 */
export async function checkExternalSearchApiHealth() {
  const health = {
    serper: {
      configured: !!serperClient,
      operational: false,
    },
    newsapi: {
      configured: !!newsapi,
      operational: false,
    },
  }

  // Test Serper if configured
  if (serperClient) {
    try {
      const result = await performGoogleSearch('test', { numResults: 1 })
      health.serper.operational = result.success
    } catch (error) {
      logger.debug({ err: error }, 'Serper health check failed')
    }
  }

  // Test NewsAPI if configured
  if (newsapi) {
    try {
      const result = await findNewsApiArticlesForEvent('test', { pageSize: 1 })
      health.newsapi.operational = result.success
    } catch (error) {
      logger.debug({ err: error }, 'NewsAPI health check failed')
    }
  }

  return health
}

/**
 * Get API usage statistics
 * @returns {Object} Usage statistics from apiCallTracker
 */
export function getApiUsageStats() {
  return apiCallTracker.getStats()
}
