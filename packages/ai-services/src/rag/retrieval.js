// packages/ai-services/src/rag/retrieval.js
import { OpenAI } from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'
import { generateQueryEmbeddings } from '../embeddings/embeddings.js'
import {
  fetchBatchWikipediaSummaries,
  validateWikipediaContent,
} from '../search/wikipedia.js'
import { getGoogleSearchResults } from '../search/serpapi.js'
import { env } from '@headlines/config'
import { logger } from '@headlines/utils-shared'

let openAIClient, pineconeIndex
function initializeClients() {
  if (!openAIClient) {
    if (env.OPENAI_API_KEY) {
      openAIClient = new OpenAI({ apiKey: env.OPENAI_API_KEY })
    }
    if (env.PINECONE_API_KEY) {
      const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY })
      pineconeIndex = pc.index(env.PINECONE_INDEX_NAME)
    }
  }
}

const SIMILARITY_THRESHOLD = 0.38

async function fetchPineconeContext(queries, exclude_entities = []) {
  initializeClients()
  if (!pineconeIndex) {
    logger.warn(
      '[RAG Retrieval] Pinecone is not configured. Skipping internal DB search.'
    )
    return []
  }

  const queryEmbeddings = await Promise.all(
    queries.map((q) => generateQueryEmbeddings(q))
  )
  const allQueryEmbeddings = queryEmbeddings.flat()

  const pineconePromises = allQueryEmbeddings.map((embedding) =>
    pineconeIndex.query({
      topK: 5,
      vector: embedding,
      includeMetadata: true,
    })
  )
  const pineconeResponses = await Promise.all(pineconePromises)

  const uniqueMatches = new Map()
  pineconeResponses.forEach((response) => {
    response?.matches?.forEach((match) => {
      if (
        !uniqueMatches.has(match.id) ||
        match.score > uniqueMatches.get(match.id).score
      ) {
        uniqueMatches.set(match.id, match)
      }
    })
  })

  const results = Array.from(uniqueMatches.values())
    .filter((match) => match.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  logger.groupCollapsed(`[RAG Retrieval] Pinecone Results (${results.length})`)
  results.forEach((match) => {
    logger.trace(`- Score: ${match.score.toFixed(4)} | ID: ${match.id}`)
    logger.trace(`  Headline: ${match.metadata.headline}`)
  })
  logger.groupEnd()

  return results
}

async function fetchValidatedWikipediaContext(entities) {
  const wikiResults = await fetchBatchWikipediaSummaries(entities)
  const validWikiResults = []
  for (const res of wikiResults.filter((r) => r.success)) {
    const validation = await validateWikipediaContent(res.summary)
    if (validation.valid) {
      validWikiResults.push({ ...res, validation })
    }
  }

  logger.groupCollapsed(`[RAG Retrieval] Wikipedia Results (${validWikiResults.length})`)
  validWikiResults.forEach((res) => {
    logger.trace(`- Title: ${res.title}`)
    logger.trace(`  Summary: ${res.summary.substring(0, 200)}...`)
  })
  logger.groupEnd()

  return validWikiResults
}

export async function retrieveContextForQuery(plan, messages, mode = 'full') {
  const { search_queries, user_query } = plan

  const pineconeResults = await fetchPineconeContext(search_queries)

  if (mode === 'ragOnly') {
    return {
      ragResults: pineconeResults,
      wikiResults: [],
      searchResults: [],
    }
  }

  const [wikipediaResults, searchResultsObj] = await Promise.all([
    fetchValidatedWikipediaContext(search_queries),
    getGoogleSearchResults(user_query),
  ])

  const searchResults = searchResultsObj.success ? searchResultsObj.results : []

  logger.groupCollapsed(
    `[RAG Retrieval] SerpAPI Google Search Results (${searchResults.length})`
  )
  searchResults.forEach((res) => {
    logger.trace(`- Title: ${res.title}`)
    logger.trace(`  Link: ${res.link}`)
    logger.trace(`  Snippet: ${res.snippet}`)
  })
  logger.groupEnd()

  return {
    ragResults: pineconeResults,
    wikiResults: wikipediaResults,
    searchResults: searchResults,
  }
}
