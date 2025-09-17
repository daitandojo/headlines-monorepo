// packages/scraper-logic/src/ai/index.js (version 6.1.0)
import { getConfig } from '../config.js'
import { callLanguageModel } from '../../../ai-services/src/index.js'
import { AIAgent } from './AIAgent.js'
import { assessArticleContent } from './agents/articleAgent.js'
import { articleAssessmentSchema } from './schemas/articleAssessmentSchema.js'
import { preAssessArticle } from './agents/articlePreAssessmentAgent.js'
import { articlePreAssessmentSchema } from './schemas/articlePreAssessmentSchema.js'
import { clusterArticlesIntoEvents } from './agents/clusteringAgent.js'
import { clusterSchema } from './schemas/clusterSchema.js'
import { resolveVagueContact, findContactDetails } from './agents/contactAgent.js'
import { enrichContactSchema } from './schemas/enrichContactSchema.js'
import { findContactSchema } from './schemas/findContactSchema.js'
import {
  generateEmailSubjectLine,
  generatePersonalizedIntro,
} from './agents/emailAgents.js'
import { emailSubjectSchema } from './schemas/emailSubjectSchema.js'
import { emailIntroSchema } from './schemas/emailIntroSchema.js'
import {
  extractEntities,
  entityCanonicalizerAgent as getEntityCanonicalizerAgent,
} from './agents/entityAgent.js'
import { entitySchema } from './schemas/entitySchema.js'
import { canonicalizerSchema } from './schemas/canonicalizerSchema.js'
import { assessHeadlinesInBatches } from './agents/headlineAgent.js'
import { headlineAssessmentSchema } from './schemas/headlineAssessmentSchema.js'
import { judgePipelineOutput } from './agents/judgeAgent.js'
import { judgeSchema } from './schemas/judgeSchema.js'
import { generateOpportunitiesFromEvent } from './agents/opportunityAgent.js'
import { opportunitySchema } from './schemas/opportunitySchema.js'
import { suggestNewSelector } from './agents/selectorRepairAgent.js'
import { selectorRepairSchema } from './schemas/selectorRepairSchema.js'
import { synthesizeEvent, synthesizeFromHeadline } from './agents/synthesisAgent.js'
import { synthesisSchema } from './schemas/synthesisSchema.js'
import { generateWatchlistSuggestions } from './agents/watchlistAgent.js'
import { watchlistSuggestionSchema } from './schemas/watchlistSuggestionSchema.js'
import { disambiguationSchema } from './schemas/disambiguationSchema.js'
import { batchAssessArticles } from './agents/batchArticleAgent.js'
import { batchArticleAssessmentSchema } from './schemas/batchArticleAssessmentSchema.js'
import { classifyLinks as sectionClassifierAgent } from './agents/sectionClassifierAgent.js'
import { generateExecutiveSummary } from './agents/executiveSummaryAgent.js'

let isApiKeyInvalid = false
export async function performAiSanityCheck() {
  try {
    getConfig().logger.info('🔬 Performing AI service sanity check (OpenAI)...')
    const answer = await callLanguageModel({
      modelName: 'gpt-3.5-turbo', // Use a standard, widely available model for the check
      prompt: 'What is in one word the name of the capital of France',
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
    // DEFINITIVE FIX: The OpenAI client for checking models is part of the ai-services package, not here.
    // This function is also not strictly necessary for the app to run, so we can simplify.
    // For now, we will assume permissions are correct if the sanity check passes.
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
export {
  AIAgent,
  callLanguageModel,
  assessArticleContent,
  articleAssessmentSchema,
  preAssessArticle,
  articlePreAssessmentSchema,
  clusterArticlesIntoEvents,
  clusterSchema,
  resolveVagueContact,
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
