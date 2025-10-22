// packages/scraper-logic/src/ai/index.js
import { getConfig } from '../config.js'

import {
  articleAssessmentSchema,
  batchArticleAssessmentSchema,
  batchHeadlineAssessmentSchema,
  canonicalizerSchema,
  clusterSchema,
  disambiguationSchema,
  emailIntroSchema,
  emailSubjectSchema,
  enrichContactSchema,
  entitySchema,
  findContactSchema,
  headlineAssessmentSchema,
  judgeSchema,
  opportunitySchema,
  sectionClassifierSchema,
  selectorRepairSchema,
  synthesisSchema,
  watchlistSuggestionSchema,
} from '@headlines/models/schemas'

import {
  callLanguageModel,
  AIAgent,
  assessArticleContent,
  clusterArticlesIntoEvents,
  // --- START OF DEFINITIVE FIX ---
  // 'resolveVagueContact' was removed as it is no longer exported by ai-services
  // --- END OF DEFINITIVE FIX ---
  findContactDetails,
  generateEmailSubjectLine,
  generatePersonalizedIntro,
  extractEntities,
  entityCanonicalizerAgent as getEntityCanonicalizerAgent,
  assessHeadlinesInBatches,
  judgePipelineOutput,
  generateOpportunitiesFromEvent,
  suggestNewSelector,
  synthesizeEvent,
  synthesizeFromHeadline,
  generateWatchlistSuggestions,
  batchAssessArticles,
  classifyLinks as sectionClassifierAgent,
  generateExecutiveSummary,
} from '@headlines/ai-services'

let isApiKeyInvalid = false
export async function performAiSanityCheck() {
  try {
    getConfig().logger.info('🔬 Performing AI service sanity check (OpenAI)...')
    const answer = await callLanguageModel({
      modelName: 'gpt-5-nano',
      userContent: 'In one word, what is the capital of France?',
      isJson: false,
    })
    if (
      answer &&
      typeof answer === 'string' &&
      answer.trim().toLowerCase().includes('paris')
    ) {
      getConfig().logger.info('✅ AI service sanity check passed.')
      return true
    } else {
      getConfig().logger.fatal(
        { details: { expected: 'paris', received: answer } },
        `OpenAI sanity check failed.`
      )
      return false
    }
  } catch (error) {
    if (error.status === 401 || error.message?.includes('Incorrect API key')) {
      getConfig().logger.fatal(`OpenAI sanity check failed due to INVALID API KEY (401).`)
    } else {
      getConfig().logger.fatal(
        { err: error },
        'OpenAI sanity check failed with an unexpected API error.'
      )
    }
    isApiKeyInvalid = true
    return false
  }
}

export async function checkModelPermissions(requiredModels) {
  getConfig().logger.info('🔬 Verifying permissions for configured OpenAI models...')
  try {
    getConfig().logger.warn(
      'Model permission check is currently a no-op, relying on sanity check.'
    )
    return true
  } catch (error) {
    getConfig().logger.fatal({ err: error }, 'Failed to verify model permissions.')
    isApiKeyInvalid = true
    return false
  }
}

// Re-export everything for the rest of the package to use.
export {
  AIAgent,
  callLanguageModel,
  assessArticleContent,
  articleAssessmentSchema,
  clusterArticlesIntoEvents,
  clusterSchema,
  // --- START OF DEFINITIVE FIX ---
  // 'resolveVagueContact' is removed from the exports as well.
  // --- END OF DEFINITIVE FIX ---
  findContactDetails,
  enrichContactSchema,
  findContactSchema,
  generateEmailSubjectLine,
  generatePersonalizedIntro,
  emailSubjectSchema,
  emailIntroSchema,
  extractEntities,
  getEntityCanonicalizerAgent as entityCanonicalizerAgent,
  entitySchema,
  canonicalizerSchema,
  assessHeadlinesInBatches,
  headlineAssessmentSchema,
  judgePipelineOutput,
  judgeSchema,
  generateOpportunitiesFromEvent,
  opportunitySchema,
  suggestNewSelector,
  selectorRepairSchema,
  synthesizeEvent,
  synthesizeFromHeadline,
  synthesisSchema,
  generateWatchlistSuggestions,
  watchlistSuggestionSchema,
  disambiguationSchema,
  batchAssessArticles,
  batchArticleAssessmentSchema,
  sectionClassifierAgent,
  generateExecutiveSummary,
}
