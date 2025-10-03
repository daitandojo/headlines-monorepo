// packages/ai-services/src/rag/validation.js
import { settings } from '@headlines/config'
import { callLanguageModel } from '../lib/langchain.js'
import { GROUNDEDNESS_CHECK_PROMPT } from './prompts.js'
import { logger } from '@headlines/utils-shared'

const HIGH_CONFIDENCE_THRESHOLD = 0.75
const SIMILARITY_THRESHOLD = 0.38

export function assessContextQuality(ragResults, wikiResults, searchResults) {
  const ragScore = ragResults.length > 0 ? Math.max(...ragResults.map((r) => r.score)) : 0
  const highQualityWiki = wikiResults.filter(
    (r) => r.validation?.quality === 'high'
  ).length
  const mediumQualityWiki = wikiResults.filter(
    (r) => r.validation?.quality === 'medium'
  ).length
  const wikiScore = highQualityWiki > 0 ? 0.7 : mediumQualityWiki > 0 ? 0.5 : 0
  const searchScore = searchResults.length > 0 ? 0.6 : 0

  const combinedScore = Math.max(ragScore, wikiScore, searchScore)

  return {
    hasHighConfidenceRAG: ragScore >= HIGH_CONFIDENCE_THRESHOLD,
    hasSufficientContext: combinedScore >= SIMILARITY_THRESHOLD,
    ragResultCount: ragResults.length,
    wikiResultCount: wikiResults.length,
    searchResultCount: searchResults.length,
    highQualityWikiCount: highQualityWiki,
    maxSimilarity: ragScore,
    combinedConfidence: combinedScore,
    hasMultipleSources:
      (ragResults.length > 0 ? 1 : 0) +
        (wikiResults.length > 0 ? 1 : 0) +
        (searchResults.length > 0 ? 1 : 0) >
      1,
    hasHighQualityContent: ragScore >= HIGH_CONFIDENCE_THRESHOLD || highQualityWiki > 0,
  }
}

export async function checkGroundedness(responseText, contextString) {
  logger.info('[RAG Validation] Performing Groundedness Check...')
  if (
    responseText.trim() ===
    'I do not have sufficient information in my sources to answer that question.'
  ) {
    logger.info('[RAG Validation] PASSED: Bot correctly stated insufficient info.')
    return { is_grounded: true, unsupported_claims: [] }
  }

  try {
    const prompt = GROUNDEDNESS_CHECK_PROMPT.replace('{CONTEXT}', contextString).replace(
      '{RESPONSE}',
      responseText
    )

    const result = await callLanguageModel({
      modelName: settings.LLM_MODEL_UTILITY,
      systemPrompt: prompt,
      userContent: 'Perform the groundedness check based on the system prompt.',
      isJson: true,
    })

    if (result.error) {
      throw new Error(result.error)
    }

    if (result.is_grounded) {
      logger.info('[RAG Validation] PASSED: Response is grounded in sources.')
    } else {
      logger.warn('[RAG Validation] FAILED: Response contains unsupported claims.')
      logger.groupCollapsed('Unsupported Claims Details')
      result.unsupported_claims.forEach((claim) => logger.warn(`- ${claim}`))
      logger.groupEnd()
    }
    return result
  } catch (error) {
    logger.error({ err: error }, '[RAG Validation] Error during verification:')
    return { is_grounded: false, unsupported_claims: ['Fact-checking system failed.'] }
  }
}
