// apps/pipeline/src/file-ingestion/ContentClassifier.js
// Classifies file content: RICH_LIST | INDIVIDUAL_LIST | ARTICLE | MIXED | UNKNOWN
import { callLanguageModel } from '@headlines/ai-services'
import { settings } from '@headlines/config'

const CLASSIFICATION_PROMPT = `You are classifying a text file to determine its content type for a wealth intelligence pipeline.

Classify the following text as exactly one of:
- RICH_LIST: A ranked or numbered list of wealthy individuals, often with net worth figures
- INDIVIDUAL_LIST: A list of names (possibly with companies or roles), not necessarily ranked by wealth
- ARTICLE: A journalistic article, press release, or narrative text about events or transactions
- MIXED: Contains both list content and article/narrative content
- UNKNOWN: Cannot be determined

Respond with JSON only:
{
  "classification": "RICH_LIST|INDIVIDUAL_LIST|ARTICLE|MIXED|UNKNOWN",
  "confidence": "high|medium|low",
  "reasoning": "one sentence",
  "detectedLanguage": "ISO-2 code of the primary language",
  "estimatedRecordCount": number or null
}`

export class ContentClassifier {
  static async classify(content) {
    const sample = content.slice(0, 500)

    const userContent = `TEXT:
${sample}

Respond with JSON only.`

    try {
      const result = await callLanguageModel({
        modelName: settings.LLM_MODEL_UTILITY,
        systemPrompt: CLASSIFICATION_PROMPT,
        userContent,
        isJson: true,
        maxTokens: 500,
      })

      if (result.error || !result.classification) {
        console.warn('  Classification failed, defaulting to ARTICLE')
        return {
          classification: 'ARTICLE',
          confidence: 'low',
          reasoning: 'Classification failed, defaulting to ARTICLE',
          detectedLanguage: 'EN',
          estimatedRecordCount: null,
        }
      }

      // Handle MIXED by extracting list portion
      if (result.classification === 'MIXED') {
        console.log('  Classification is MIXED - will split processing')
      }

      // Map language codes
      const langMap = {
        DA: 'DK', DE: 'DE', NL: 'NL', FR: 'FR', IT: 'IT', ES: 'ES',
        SV: 'SE', NO: 'NO', FI: 'FI', EN: 'EN', GB: 'UK',
      }

      return {
        classification: result.classification,
        confidence: result.confidence || 'medium',
        reasoning: result.reasoning || '',
        detectedLanguage: langMap[result.detectedLanguage?.toUpperCase()] || 'EN',
        estimatedRecordCount: result.estimatedRecordCount || null,
      }
    } catch (error) {
      console.warn('  Classification error:', error.message)
      return {
        classification: 'ARTICLE',
        confidence: 'low',
        reasoning: `Classification error: ${error.message}`,
        detectedLanguage: 'EN',
        estimatedRecordCount: null,
      }
    }
  }
}