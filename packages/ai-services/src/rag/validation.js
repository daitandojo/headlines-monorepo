// packages/ai-services/src/rag/validation.js (Corrected)
import { settings } from '@headlines/config'
import { callLanguageModel } from '../lib/langchain.js'
import { GROUNDEDNESS_CHECK_PROMPT } from './prompts.js'

// --- Constants ---
const HIGH_CONFIDENCE_THRESHOLD = 0.75
const SIMILARITY_THRESHOLD = 0.38

// --- Internal Helper Functions ---
function simpleEntityExtractor(text, sourceIdentifier) {
  const match = text.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/)
  if (match) return [{ name: match[0], facts: [text] }]
  return [{ name: sourceIdentifier, facts: [text] }]
}

function extractEntitiesFromRAG(ragResults) {
  if (!ragResults) return []
  return ragResults.flatMap((r) =>
    simpleEntityExtractor(r.metadata?.summary || '', r.metadata?.headline || 'RAG Source')
  )
}

function extractEntitiesFromWiki(wikiResults) {
  if (!wikiResults) return []
  return wikiResults.flatMap((w) =>
    simpleEntityExtractor(w.summary || '', w.title || 'Wiki Source')
  )
}

function entitySimilarity(entityA, entityB) {
  const nameA = entityA.name.toLowerCase()
  const nameB = entityB.name.toLowerCase()
  if (nameA.includes(nameB) || nameB.includes(nameA)) return 0.9
  return 0
}

function factsConflict(factsA, factsB) {
  // Placeholder for a future NLI model implementation.
  return false
}

// --- Exported Validation Functions ---

export function assessContextQuality(ragResults, wikiResults, searchResults) {
  const ragScore = ragResults.length > 0 ? Math.max(...ragResults.map((r) => r.score)) : 0
  const highQualityWiki = wikiResults.filter(
    (r) => r.validation?.quality === 'high'
  ).length
  const mediumQualityWiki = wikiResults.filter(
    (r) => r.validation?.quality === 'medium'
  ).length
  const wikiScore = highQualityWiki > 0 ? 0.7 : mediumQualityWiki > 0 ? 0.5 : 0
  const searchScore = searchResults.length > 0 ? 0.6 : 0 // Assign a moderate score if search results exist

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

export function crossValidateSources(ragResults, wikiResults) {
  // This function is becoming less critical with the strict generation prompt,
  // but we'll keep its structure.
  const validation = { conflicts: [], confirmations: [], reliability: 'unknown' }

  if (
    (!ragResults || ragResults.length === 0) &&
    (!wikiResults || wikiResults.length === 0)
  ) {
    validation.reliability = 'single_source' // or 'no_source'
    return validation
  }

  // Simplified logic for now
  if (ragResults.length > 0 && wikiResults.length > 0) {
    validation.reliability = 'confirmed' // Assume confirmation if both exist
  } else {
    validation.reliability = 'single_source'
  }

  return validation
}

export async function checkGroundedness(responseText, contextString) {
  console.log('[RAG Validation] Performing Groundedness Check...')
  if (
    responseText.trim() ===
    'I do not have sufficient information in my sources to answer that question.'
  ) {
    console.log('[RAG Validation] PASSED: Bot correctly stated insufficient info.')
    return { is_grounded: true, unsupported_claims: [] }
  }

  try {
    const prompt = GROUNDEDNESS_CHECK_PROMPT.replace('{CONTEXT}', contextString).replace(
      '{RESPONSE}',
      responseText
    )

    // CORRECTED: Use the project's standard AI call function and configured model
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
      console.log('[RAG Validation] PASSED: Response is grounded in sources.')
    } else {
      console.warn('[RAG Validation] FAILED: Response contains unsupported claims.')
      console.groupCollapsed('Unsupported Claims Details')
      result.unsupported_claims.forEach((claim) => console.warn(`- ${claim}`))
      console.groupEnd()
    }
    return result
  } catch (error) {
    console.error('[RAG Validation] Error during verification:', error)
    // Fail safe: if the check fails, assume the response is not grounded.
    return { is_grounded: false, unsupported_claims: ['Fact-checking system failed.'] }
  }
}
