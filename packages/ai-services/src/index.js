// packages/ai-services/src/index.js (version 2.0.1)
import 'server-only'

import { callLanguageModel } from './lib/langchain.js'
import * as chains from './chains/index.js'
import * as search from './search/search.js'
import * as wikipedia from './search/wikipedia.js'
import * as embeddings from './embeddings/embeddings.js'
import * as vectorSearch from './embeddings/vectorSearch.js'
import { logger } from '@headlines/utils-server'
import { processChatRequest } from './rag/orchestrator.js'

export async function performAiSanityCheck(settings) {
  try {
    logger.info('🔬 Performing AI service sanity check (OpenAI)...')
    const answer = await callLanguageModel({
      modelName: settings.LLM_MODEL_UTILITY,
      prompt: 'What is in one word the name of the capital of France',
      isJson: false,
    })
    if (
      answer &&
      typeof answer === 'string' &&
      answer.trim().toLowerCase().includes('paris')
    ) {
      logger.info('✅ AI service sanity check passed.')
      return true
    } else {
      logger.fatal(
        { details: { expected: 'paris', received: answer } },
        `OpenAI sanity check failed.`
      )
      return false
    }
  } catch (error) {
    if (error.status === 401 || error.message?.includes('Incorrect API key')) {
      logger.fatal(`OpenAI sanity check failed due to INVALID API KEY (401).`)
    } else {
      logger.fatal(
        { err: error },
        'OpenAI sanity check failed with an unexpected API error.'
      )
    }
    return false
  }
}

export { processChatRequest, callLanguageModel }
export const {
  articleChain,
  articlePreAssessmentChain,
  clusteringChain,
  contactFinderChain,
  contactResolverChain,
  disambiguationChain,
  emailIntroChain,
  emailSubjectChain,
  entityCanonicalizerChain,
  entityExtractorChain,
  executiveSummaryChain,
  headlineChain,
  batchHeadlineChain,
  judgeChain,
  opportunityChain,
  sectionClassifierChain,
  selectorRepairChain,
  synthesisChain,
  watchlistSuggestionChain,
  translateChain,
  countryCorrectionChain,
} = chains
export const {
  findAlternativeSources,
  performGoogleSearch,
  findNewsApiArticlesForEvent,
} = search
export const { fetchWikipediaSummary } = wikipedia
export const { generateEmbedding } = embeddings
export const { findSimilarArticles } = vectorSearch
