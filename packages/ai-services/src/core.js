// This is the core, shared module for the ai-services package.
// It exports all AI chains, agents, and utility functions.

// --- Low-Level LangChain Primitives & Helpers ---
import { callLanguageModel } from './lib/langchain.js'
import * as chains from './chains/index.js'
import * as search from './search/search.js'
import * as wikipedia from './search/wikipedia.js'
import * as embeddings from './embeddings/embeddings.js'
import * as vectorSearch from './embeddings/vectorSearch.js'
import { processChatRequest } from './rag/orchestrator.js'
import { logger } from '@headlines/utils-server/node' // Use the node-safe entry point
import { settings } from '@headlines/config/node' // Use the node-safe entry point

// --- High-Level Agents (Moved from scraper-logic) ---
// Note: You will need to ensure the agent files themselves are moved into `packages/ai-services/src/agents/`
// and their internal imports are updated to be relative to their new location.
import { assessArticleContent } from './agents/articleAgent.js';
import { preAssessArticle } from './agents/articlePreAssessmentAgent.js';
import { batchAssessArticles } from './agents/batchArticleAgent.js';
import { clusterArticlesIntoEvents } from './agents/clusteringAgent.js';
import { findContactDetails } from './agents/contactAgent.js';
import { generateEmailSubjectLine, generatePersonalizedIntro } from './agents/emailAgents.js';
import { extractEntities, entityCanonicalizerAgent } from './agents/entityAgent.js';
import { generateExecutiveSummary } from './agents/executiveSummaryAgent.js';
import { assessHeadlinesInBatches } from './agents/headlineAgent.js';
import { judgePipelineOutput } from './agents/judgeAgent.js';
import { generateOpportunitiesFromEvent } from './agents/opportunityAgent.js';
import { classifyLinks as sectionClassifierAgent } from './agents/sectionClassifierAgent.js'; // aliased to match old export
import { suggestNewSelector } from './agents/selectorRepairAgent.js';
import { synthesizeEvent, synthesizeFromHeadline } from './agents/synthesisAgent.js';
import { generateWatchlistSuggestions } from './agents/watchlistAgent.js';

// --- Sanity Check Function ---
export async function performAiSanityCheck() {
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

// --- EXPORT ALL FUNCTIONALITY ---

// Foundational exports
export { processChatRequest, callLanguageModel }

// Low-level chains (re-exported from chains/index.js)
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

// External search and data retrieval services
export const {
  findAlternativeSources,
  performGoogleSearch,
  findNewsApiArticlesForEvent,
} = search
export const { fetchWikipediaSummary } = wikipedia

// Vector embedding and search services
export const { generateEmbedding } = embeddings
export const { findSimilarArticles } = vectorSearch

// High-level agent functions
export {
  assessArticleContent,
  preAssessArticle,
  batchAssessArticles,
  clusterArticlesIntoEvents,
  findContactDetails,
  generateEmailSubjectLine,
  generatePersonalizedIntro,
  extractEntities,
  entityCanonicalizerAgent,
  assessHeadlinesInBatches,
  judgePipelineOutput,
  generateOpportunitiesFromEvent,
  sectionClassifierAgent,
  suggestNewSelector,
  synthesizeEvent,
  synthesizeFromHeadline,
  generateWatchlistSuggestions,
  generateExecutiveSummary,
}