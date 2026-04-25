// packages/ai-services/src/enrichment/familyOfficeSearch.js
// GAP 2: Family office search at UBO identification time
import { z } from 'zod'
import { performGoogleSearch } from '../index.js'
import { callLanguageModel } from '../lib/langchain.js'
import { buildLocalizedQueries } from './localizedSearch.js'
import { logger } from '@headlines/utils-shared'

function getSettings() {
  try {
    return require('@headlines/config')
  } catch (e) {
    return { settings: { LLM_MODEL_UTILITY: 'xiaomi/mimo-v2-flash' } }
  }
}

const FO_SCHEMA = {
  name: z.string(),
  country: z.string(),
  cio_name: z.string().nullable(),
  contact_hint: z.string().nullable(),
  source_url: z.string().nullable(),
  confidence: z.enum(['confirmed', 'probable', 'possible']),
}

export async function searchFamilyOffice(surname, countryCode) {
  if (!surname || surname.length < 2) return null
  
  const foResults = []
  let queriesUsed = []
  
  // Build candidate queries
  const baseQueries = [
    `"${surname} family office" ${countryCode || ''}`.trim(),
    `"${surname} capital" OR "${surname} investments" ${countryCode || ''}`.trim(),
    `"${surname} holding" OR "${surname} patrimoine" OR "${surname} vermögen" ${countryCode || ''}`.trim(),
  ]
  
  for (const baseQuery of baseQueries) {
    try {
      // GAP 3: Build localized query first
      const locResult = await buildLocalizedQueries(baseQuery, countryCode)
      const queryToUse = locResult.localized || baseQuery
      const langUsed = locResult.localized ? locResult.language : 'English'
      queriesUsed.push(`${queryToUse} [${langUsed}]`)
      
      logger.info(`[FamilyOffice] Query: ${queryToUse} (lang: ${langUsed})`)
      
      const searchResult = await performGoogleSearch(queryToUse, { numResults: 3 })
      if (!searchResult.success || !searchResult.snippets) continue
      
      // LLM extraction from snippets
      const systemPrompt = `Extract family office information from the search results. Return JSON with: name, country, cio_name (if found), contact_hint (if found), source_url, confidence ("confirmed" if explicitly called "family office", "probable" if holding company, "possible" otherwise).`
      const userContent = `Query: ${queryToUse}\n\nResults:\n${searchResult.snippets}`
      
      const result = await callLanguageModel({
        modelName: getSettings().settings?.LLM_MODEL_UTILITY || 'xiaomi/mimo-v2-flash',
        systemPrompt,
        userContent,
        isJson: true,
      })
      
      if (result && result.name) {
        foResults.push(result)
        logger.info(`[FamilyOffice] Found: ${result.name} (confidence: ${result.confidence})`)
      }
    } catch (err) {
      logger.warn({ err: err.message }, '[FamilyOffice] Search failed for query')
    }
  }
  
  if (foResults.length === 0) {
    logger.info(`[FamilyOffice] No family office found for "${surname}"`)
    return null
  }
  
  // Return best result (confirmed > probable > possible)
  const confOrder = { confirmed: 3, probable: 2, possible: 1 }
  foResults.sort((a, b) => (confOrder[b.confidence] || 1) - (confOrder[a.confidence] || 1))
  
  return {
    ...foResults[0],
    queriesUsed,
  }
}

// Wrapper for use in synthesis context
export async function searchFamilyOfficeForUBO(uboName, countryCode) {
  // Extract surname from full name
  const nameParts = uboName.trim().split(/\s+/)
  const surname = nameParts[nameParts.length - 1] // Last part = surname
  
  logger.info(`[FamilyOffice] Searching for UBO: ${uboName} (surname: ${surname})`)
  
  return searchFamilyOffice(surname, countryCode)
}