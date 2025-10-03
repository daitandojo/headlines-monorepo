// packages/ai-services/src/shared/agents/contactAgent.js
import { logger } from '@headlines/utils-shared'
import { AIAgent } from '../../lib/AIAgent.js'
import { findContactSchema } from '@headlines/models/schemas'
import { settings } from '@headlines/config/node'
import { instructionContacts } from '@headlines/prompts'
import { performGoogleSearch } from '../../search/search.js'

const getFinderAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_ARTICLE_ASSESSMENT,
    systemPrompt: instructionContacts,
    zodSchema: findContactSchema,
  })

export async function findContactDetails(person) {
  const contactFinderAgent = getFinderAgent()
  logger.info(`[Contact Research Agent] Initiated for: ${person.reachOutTo}`)

  const company = person.contactDetails?.company || ''
  const queries = [
    `"${person.reachOutTo}" ${company} email address`,
    `"${person.reachOutTo}" contact information`,
  ]

  let combinedSnippets = ''
  for (const query of queries) {
    const searchResult = await performGoogleSearch(query)
    if (searchResult.success && searchResult.snippets) {
      combinedSnippets += `\n--- Results for query: "${query}" ---\n${searchResult.snippets}`
    }
  }

  if (!combinedSnippets) {
    logger.warn(`[Contact Research Agent] No search results for "${person.reachOutTo}".`)
    return { email: null }
  }

  const response = await contactFinderAgent.execute(combinedSnippets)

  if (response.error || !response.email) {
    logger.warn(
      `[Contact Research Agent] LLM failed to extract details for "${person.reachOutTo}".`
    )
    return { email: null }
  }

  logger.info(
    { details: response },
    `[Contact Research Agent] Found details for "${person.reachOutTo}".`
  )
  return response
}
