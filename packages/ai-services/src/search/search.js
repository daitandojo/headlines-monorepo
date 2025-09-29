'use server'
import axios from 'axios'
import NewsAPI from 'newsapi'
import { env } from '@headlines/config'
import { logger, apiCallTracker } from '@headlines/utils-server'

const { SERPER_API_KEY, NEWSAPI_API_KEY } = env
const serperClient = SERPER_API_KEY
  ? axios.create({
      baseURL: 'https://google.serper.dev',
      headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
    })
  : null
const newsapi = NEWSAPI_API_KEY ? new NewsAPI(NEWSAPI_API_KEY) : null

if (!serperClient)
  logger.warn(
    'SERPER_API_KEY not found. Google Search dependent functions will be disabled.'
  )
if (!newsapi)
  logger.warn('NEWSAPI_API_KEY not found. NewsAPI dependent functions will be disabled.')

async function withRetry(apiCall, serviceName, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall()
    } catch (error) {
      const isRetryable = error.response && error.response.status >= 500
      if (!isRetryable || attempt === maxRetries) {
        logger.error(
          { err: error?.response?.data || error },
          `${serviceName} search failed.`
        )
        return { success: false, error: error.message, results: [] }
      }
      const delay = 1000 * Math.pow(2, attempt - 1)
      logger.warn(`[${serviceName}] Attempt ${attempt} failed. Retrying in ${delay}ms...`)
      await new Promise((res) => setTimeout(res, delay))
    }
  }
}

export async function findAlternativeSources(headline) {
  if (!serperClient) return { success: false, results: [] }
  return withRetry(async () => {
    apiCallTracker.recordCall('serper_news')
    const response = await serperClient.post('/news', { q: headline })
    return { success: true, results: response.data.news || [] }
  }, 'Serper News')
}
export async function performGoogleSearch(query) {
  if (!serperClient) return { success: false, snippets: 'SERPER_API_KEY not configured.' }
  return withRetry(async () => {
    apiCallTracker.recordCall('serper_search')
    const response = await serperClient.post('/search', { q: query })
    const organicResults = response.data.organic || []
    if (organicResults.length > 0) {
      const snippets = organicResults
        .slice(0, 5)
        .map((res) => `- ${res.title}: ${res.snippet}`)
        .join('\n')
      return { success: true, snippets }
    }
    return { success: false, snippets: 'No search results found.' }
  }, 'Serper Search')
}
export async function findNewsApiArticlesForEvent(headline) {
  if (!newsapi) return { success: false, snippets: 'NewsAPI key not configured.' }
  return withRetry(async () => {
    apiCallTracker.recordCall('newsapi_search')
    const response = await newsapi.v2.everything({
      q: `"${headline}"`,
      pageSize: 5,
      sortBy: 'relevancy',
      language: 'en,da,sv,no',
    })
    if (response.articles && response.articles.length > 0) {
      const snippets = response.articles
        .map((a) => `- ${a.title} (${a.source.name}): ${a.description || ''}`)
        .join('\n')
      return { success: true, snippets }
    }
    return { success: false, snippets: 'No related articles found.' }
  }, 'NewsAPI')
}
