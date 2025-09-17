// packages/ai-services/src/index.js (version 7.2.0)
'use server'

import { callLanguageModel } from './lib/langchain.js'
import * as chains from './chains/index.js'
import * as search from './search.js'
import * as wikipedia from './wikipedia.js'
import * as embeddings from './embeddings.js'
import * as vectorSearch from './vectorSearch.js'
import { logger } from '../../utils/src/server.js'

// This is the primary public API of the package.
// It only exports async functions, making it compatible with Next.js "use server" modules.

export async function performAiSanityCheck(settings) {
  try {
    logger.info('🔬 Performing AI service sanity check (OpenAI)...')
    const answer = await callLanguageModel({
      modelName: settings.LLM_MODEL_UTILITY, // Use the dynamic utility model
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

// Re-export all functions from submodules.
export { callLanguageModel }
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
