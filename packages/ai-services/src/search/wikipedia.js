'use server'; 
// DEFINITIVE FIX: Import the logger directly. It is a server-safe module.
import { logger, apiCallTracker } from '@headlines/utils-server'
import { disambiguationChain } from '../chains/index.js'

const WIKI_API_ENDPOINT = 'https://en.wikipedia.org/w/api.php'
const WIKI_SUMMARY_LENGTH = 750

async function fetchWithRetry(url, options, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      if (!response.ok) throw new Error(`API returned status ${response.status}`)
      return response
    } catch (error) {
      if (attempt === maxRetries) throw error
      const delay = 1000 * Math.pow(2, attempt - 1)
      logger.warn(
        `[Wikipedia Fetch] Attempt ${attempt} failed for ${url}. Retrying in ${delay}ms...`
      )
      await new Promise((res) => setTimeout(res, delay))
    }
  }
}

export async function fetchWikipediaSummary(query) {
  if (!query) return { success: false, error: 'Query cannot be empty.' }
  try {
    apiCallTracker.recordCall('wikipedia')
    const searchParams = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query,
      srlimit: '5',
      format: 'json',
    })
    const searchResponse = await fetchWithRetry(
      `${WIKI_API_ENDPOINT}?${searchParams.toString()}`
    )
    const searchData = await searchResponse.json()
    const searchResults = searchData.query.search
    if (!searchResults || searchResults.length === 0)
      throw new Error(`No search results for "${query}".`)

    const userContent = `Original Query: "${query}"\n\nSearch Results:\n${JSON.stringify(searchResults.map((r) => ({ title: r.title, snippet: r.snippet })))}`
    const disambiguationResponse = await disambiguationChain({ inputText: userContent })

    if (disambiguationResponse.error || !disambiguationResponse.best_title) {
      throw new Error(
        disambiguationResponse.error ||
          `AI agent could not disambiguate a relevant page for "${query}".`
      )
    }
    const { best_title } = disambiguationResponse

    const summaryParams = new URLSearchParams({
      action: 'query',
      prop: 'extracts',
      exintro: 'true',
      explaintext: 'true',
      titles: best_title,
      format: 'json',
      redirects: '1',
    })
    const summaryResponse = await fetchWithRetry(
      `${WIKI_API_ENDPOINT}?${summaryParams.toString()}`
    )
    const summaryData = await summaryResponse.json()
    const pages = summaryData.query.pages
    const pageId = Object.keys(pages)[0]
    const summary = pages[pageId]?.extract
    if (!summary) throw new Error(`Could not extract summary for page "${best_title}".`)

    const conciseSummary =
      summary.length > WIKI_SUMMARY_LENGTH
        ? summary.substring(0, WIKI_SUMMARY_LENGTH) + '...'
        : summary
    return { success: true, summary: conciseSummary, title: best_title, query }
  } catch (error) {
    logger.warn(`Wikipedia lookup for "${query}" failed: ${error.message}`)
    return { success: false, error: error.message, query }
  }
}

export async function fetchBatchWikipediaSummaries(queries) {
  const promises = queries.map((q) => fetchWikipediaSummary(q))
  return Promise.all(promises)
}

export async function validateWikipediaContent(text) {
  const lowerText = text.toLowerCase()
  const isDisambiguation =
    lowerText.includes('may refer to:') || lowerText.includes('is a list of')
  if (isDisambiguation) {
    return {
      valid: false,
      quality: 'low',
      reason: 'Disambiguation page content detected.',
    }
  }
  return {
    valid: true,
    quality: 'high',
    reason: 'Content appears to be a valid summary.',
  }
}
