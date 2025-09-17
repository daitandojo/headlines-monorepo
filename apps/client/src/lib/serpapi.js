// src/lib/serpapi.js (version 1.0)
'use server'

import { getJson } from 'serpapi'
import { env } from '@/lib/env.mjs'

// Simple in-memory cache
const searchCache = new Map()
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

/**
 * Fetches Google search results for a given query using SerpAPI.
 * @param {string} query The search query.
 * @returns {Promise<{success: boolean, results?: Array<object>, error?: string}>}
 */
export async function getGoogleSearchResults(query) {
  if (!query) {
    return { success: false, error: 'Query is required.' }
  }

  const cacheKey = `serpapi_${query.toLowerCase().trim()}`
  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey)
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[SerpAPI Cache] Hit for query: "${query}"`)
      return cached.data
    }
  }

  console.log(`[SerpAPI] Performing live search for: "${query}"`)

  try {
    const response = await getJson({
      api_key: env.SERPAPI_API_KEY,
      engine: 'google',
      q: query,
      location: 'United States',
      gl: 'us',
      hl: 'en',
    })

    const organicResults = response.organic_results || []
    const answerBox = response.answer_box ? [response.answer_box] : []

    const formattedResults = [...answerBox, ...organicResults]
      .map((item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet || item.answer || item.result,
        source: 'Google Search',
      }))
      .filter((item) => item.snippet)
      .slice(0, 5) // Take top 5 with snippets

    const result = { success: true, results: formattedResults }
    searchCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch (error) {
    console.error('[SerpAPI Error]', error)
    return { success: false, error: `Failed to fetch search results: ${error.message}` }
  }
}
