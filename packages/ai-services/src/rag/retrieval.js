// File: packages/ai-services/src/rag/retrieval.js (Unabridged and Corrected)

'use server'

import { OpenAI } from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'
import { generateQueryEmbeddings } from '../embeddings/embeddings.js'
import {
  fetchBatchWikipediaSummaries,
  validateWikipediaContent,
} from '../search/wikipedia.js'
import { getGoogleSearchResults } from '../search/serpapi.js'
import { env } from '@headlines/config'

let openAIClient, pineconeIndex
function initializeClients() {
  if (!openAIClient) {
    openAIClient = new OpenAI({ apiKey: env.OPENAI_API_KEY })
    const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY })
    pineconeIndex = pc.index(env.PINECONE_INDEX_NAME)
  }
}

const ENTITY_EXTRACTOR_MODEL = 'gpt-5-mini'
const SIMILARITY_THRESHOLD = 0.38
const ENTITY_EXTRACTOR_PROMPT_FOR_HISTORY = `You are an entity extractor. Your job is to identify all specific people and companies mentioned in a given text.
Respond ONLY with a valid JSON object with the following structure:
{ "entities": ["Entity Name 1", "Entity Name 2"] }
`

// This function is no longer called by the main orchestrator but is kept for potential future use.
async function extractEntitiesFromHistory(messages) {
  if (messages.length < 2) {
    return []
  }
  const historyText = messages
    .slice(-4)
    .map((m) => m.content)
    .join('\n')

  initializeClients()
  try {
    const entityResponse = await openAIClient.chat.completions.create({
      model: ENTITY_EXTRACTOR_MODEL,
      messages: [
        { role: 'system', content: ENTITY_EXTRACTOR_PROMPT_FOR_HISTORY },
        {
          role: 'user',
          content: `Extract all key people and companies from this text:\n"${historyText}"`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const { entities } = JSON.parse(entityResponse.choices[0].message.content)
    const cleanEntities = entities.map((e) =>
      e.replace(/\s*\((person|company)\)$/, '').trim()
    )
    if (cleanEntities.length > 0) {
      console.log(
        `[RAG Retrieval] Entities from history for exclusion: ${cleanEntities.join(', ')}`
      )
    }
    return cleanEntities
  } catch (error) {
    console.error('Could not extract entities from history:', error)
    return []
  }
}

async function fetchPineconeContext(queries, exclude_entities = []) {
  initializeClients()
  const queryEmbeddings = await Promise.all(
    queries.map((q) => generateQueryEmbeddings(q))
  )
  const allQueryEmbeddings = queryEmbeddings.flat()

  const filter =
    exclude_entities.length > 0
      ? { 'metadata.entities': { $nin: exclude_entities } }
      : undefined

  if (filter) {
    console.log('[RAG Retrieval] Applying Pinecone filter to exclude:', exclude_entities)
  }

  const pineconePromises = allQueryEmbeddings.map((embedding) =>
    pineconeIndex.query({
      topK: 5,
      vector: embedding,
      includeMetadata: true,
      filter: filter,
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

  console.groupCollapsed(`[RAG Retrieval] Pinecone Results (${results.length})`)
  results.forEach((match) => {
    console.log(`- Score: ${match.score.toFixed(4)} | ID: ${match.id}`)
    console.log(`  Headline: ${match.metadata.headline}`)
  })
  console.groupEnd()

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

  console.groupCollapsed(`[RAG Retrieval] Wikipedia Results (${validWikiResults.length})`)
  validWikiResults.forEach((res) => {
    console.log(`- Title: ${res.title}`)
    console.log(`  Summary: ${res.summary.substring(0, 200)}...`)
  })
  console.groupEnd()

  return validWikiResults
}

export async function retrieveContextForQuery(plan, messages, mode = 'full') {
  const { search_queries, user_query } = plan

  const entitiesToExclude = []
  console.log('[RAG Retrieval] History-based entity exclusion is temporarily disabled.')

  const pineconeResults = await fetchPineconeContext(search_queries, entitiesToExclude)

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

  console.groupCollapsed(
    `[RAG Retrieval] SerpAPI Google Search Results (${searchResults.length})`
  )
  searchResults.forEach((res) => {
    console.log(`- Title: ${res.title}`)
    console.log(`  Link: ${res.link}`)
    console.log(`  Snippet: ${res.snippet}`)
  })
  console.groupEnd()

  return {
    ragResults: pineconeResults,
    wikiResults: wikipediaResults,
    searchResults: searchResults,
  }
}
