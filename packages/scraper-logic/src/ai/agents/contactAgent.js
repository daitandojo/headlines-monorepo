// packages/scraper-logic/src/ai/agents/contactAgent.js (version 3.1.3)
import { AIAgent } from '../AIAgent.js'
import { enrichContactSchema } from '../schemas/enrichContactSchema.js'
import { findContactSchema } from '../schemas/findContactSchema.js'
import { env } from '@headlines/config'
import { instructionEnrichContact } from '@headlines/prompts'
import { instructionContacts } from '@headlines/prompts'
// DEFINITIVE FIX: Removed the duplicate import of getConfig.
import { getConfig } from '../../config.js'

const getResolverAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_ARTICLE_ASSESSMENT,
    systemPrompt: instructionEnrichContact,
    zodSchema: enrichContactSchema,
  })

const getFinderAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_ARTICLE_ASSESSMENT,
    systemPrompt: instructionContacts,
    zodSchema: findContactSchema,
  })

export async function resolveVagueContact(contact, article) {
  const contactResolverAgent = getResolverAgent()
  const config = getConfig()
  const researchQuery = `${contact.name} ${contact.company || article.newspaper}`
  const searchResult =
    await getConfig().utilityFunctions.performGoogleSearch(researchQuery)

  if (!searchResult.success) {
    getConfig().logger.warn(
      `[Resolve Agent] Google search failed for "${researchQuery}".`
    )
    return [contact]
  }

  const context = `Initial Contact Profile:\n${JSON.stringify(
    contact
  )}\n\nSource Article Headline: ${
    article.headline
  }\n\nGoogle Search Snippets:\n${searchResult.snippets}`
  const response = await contactResolverAgent.execute(context)

  if (
    response.error ||
    !response.enriched_contacts ||
    response.enriched_contacts.length === 0
  ) {
    getConfig().logger.warn(
      `[Resolve Agent] Failed to resolve contact "${contact.name}".`
    )
    return [contact]
  }

  getConfig().logger.info(
    `[Resolve Agent] Successfully resolved "${contact.name}" -> "${response.enriched_contacts
      .map((c) => c.name)
      .join(', ')}"`
  )
  return response.enriched_contacts
}

export async function findContactDetails(person) {
  const contactFinderAgent = getFinderAgent()
  const config = getConfig()
  getConfig().logger.info(`[Contact Research Agent] Initiated for: ${person.reachOutTo}`)
  const queries = [
    `"${person.reachOutTo}" ${person.contactDetails.company} email address`,
    `"${person.reachOutTo}" contact information`,
  ]

  let combinedSnippets = ''
  for (const query of queries) {
    const searchResult = await getConfig().utilityFunctions.performGoogleSearch(query)
    if (searchResult.success && searchResult.snippets) {
      combinedSnippets += `\n--- Results for query: "${query}" ---\n${searchResult.snippets}`
    }
  }

  if (!combinedSnippets) {
    getConfig().logger.warn(
      `[Contact Research Agent] No search results for "${person.reachOutTo}".`
    )
    return { email: null }
  }

  const response = await contactFinderAgent.execute(combinedSnippets)

  if (response.error || !response.email) {
    getConfig().logger.warn(
      `[Contact Research Agent] LLM failed to extract details for "${person.reachOutTo}".`
    )
    return { email: null }
  }

  getConfig().logger.info(
    { details: response },
    `[Contact Research Agent] Found details for "${person.reachOutTo}".`
  )
  return response
}
