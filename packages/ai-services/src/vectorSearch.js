// packages/ai-services/src/vectorSearch.js (version 1.1.0)
import { Pinecone } from '@pinecone-database/pinecone'
import { logger } from '../../utils/src/server.js';
import { generateEmbedding } from './embeddings.js'
import { env } from '../../config/src/index.js'

const { PINECONE_API_KEY, PINECONE_INDEX_NAME } = env

const SIMILARITY_THRESHOLD = 0.65
const MAX_CONTEXT_ARTICLES = 3

let pineconeIndex
if (PINECONE_API_KEY) {
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY })
  pineconeIndex = pc.index(PINECONE_INDEX_NAME)
} else {
  logger.warn(
    'Pinecone API Key not found. RAG/vector search functionality will be disabled.'
  )
}

/**
 * Finds historical articles similar to a given query text by querying Pinecone.
 * @param {string} queryText - The text to search for (e.g., a headline or comma-separated entities).
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of relevant historical articles.
 */
export async function findSimilarArticles(queryText) {
  if (!pineconeIndex) return []
  logger.info('RAG: Searching for historical context in Pinecone...');
  if (!queryText || typeof queryText !== 'string' || queryText.trim().length === 0) return [];

  try {
    const queryEmbedding = await generateEmbedding(queryText);

    const queryResponse = await pineconeIndex.query({
      topK: MAX_CONTEXT_ARTICLES,
      vector: queryEmbedding,
      includeMetadata: true,
    });

    const relevantMatches = queryResponse.matches.filter(
      (match) => match.score >= SIMILARITY_THRESHOLD
    );

    if (relevantMatches.length > 0) {
      const retrievedArticlesForLogging = relevantMatches
        .map(
          (match) => `  - [Score: ${match.score.toFixed(3)}] "${match.metadata.headline}"`
        )
        .join('\n')
      logger.info(
        `RAG: Found ${relevantMatches.length} relevant historical articles:\n${retrievedArticlesForLogging}`
      )
      return relevantMatches.map((match) => ({
        headline: match.metadata.headline,
        newspaper: match.metadata.newspaper,
        assessment_article: match.metadata.summary,
      }))
    } else {
      logger.info('RAG: Found no relevant historical articles in Pinecone.')
      return []
    }
  } catch (error) {
    logger.error({ err: error }, 'RAG: Pinecone query or embedding generation failed.')
    return []
  }
}
