// packages/ai-services/src/index.js
// This is the default, Node.js-safe entry point. It exports everything.

// --- SHARED EXPORTS ---
export * from './lib/langchain.js' // CORRECTED PATH
export * from './chains/index.js'
export * from './search/search.js'
export * from './search/wikipedia.js'
export * from './embeddings/embeddings.js'
export * from './embeddings/vectorSearch.js'
export * from './shared/agents/synthesisAgent.js'
export * from './shared/agents/opportunityAgent.js'
export * from './shared/agents/contactAgent.js'
export * from './shared/agents/entityAgent.js'
export * from './shared/agents/emailAgents.js'
export * from './shared/agents/executiveSummaryAgent.js'

// --- NODE-ONLY EXPORTS ---
export * from './node/agents/articleAgent.js'
export * from './node/agents/articlePreAssessmentAgent.js'
export * from './node/agents/batchArticleAgent.js'
export * from './node/agents/clusteringAgent.js'
export * from './node/agents/headlineAgent.js'
export * from './node/agents/judgeAgent.js'
export * from './node/agents/sectionClassifierAgent.js'
export * from './node/agents/selectorRepairAgent.js'
export * from './node/agents/watchlistAgent.js'

// --- Sanity Check Function ---
import { logger } from '@headlines/utils-shared'
import { settings } from '@headlines/config/node'
import { callLanguageModel } from './lib/langchain.js' // CORRECTED PATH

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
