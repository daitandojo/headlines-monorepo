import { logger } from '@headlines/utils-server/node';
import { AIAgent } from '../lib/AIAgent.js';
import { findContactSchema } from '../schemas/findContactSchema.js';
import { settings } from '@headlines/config/node';
import { instructionContacts } from '@headlines/prompts';
import { performGoogleSearch } from '../search/search.js'; // Import search function directly

const getFinderAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_ARTICLE_ASSESSMENT,
    systemPrompt: instructionContacts,
    zodSchema: findContactSchema,
  });

/**
 * Uses Google search and an AI agent to find a contact email for a given person.
 * @param {object} person - An object representing the person to research.
 *  - {string} reachOutTo - The person's full name.
 *  - {object} contactDetails - An object with a `company` property.
 * @returns {Promise<{email: string|null}>} An object containing the found email or null.
 */
export async function findContactDetails(person) {
  const contactFinderAgent = getFinderAgent();
  logger.info(`[Contact Research Agent] Initiated for: ${person.reachOutTo}`);
  
  const company = person.contactDetails?.company || '';
  const queries = [
    `"${person.reachOutTo}" ${company} email address`,
    `"${person.reachOutTo}" contact information`,
  ];

  let combinedSnippets = '';
  for (const query of queries) {
    const searchResult = await performGoogleSearch(query);
    if (searchResult.success && searchResult.snippets) {
      combinedSnippets += `\n--- Results for query: "${query}" ---\n${searchResult.snippets}`;
    }
  }

  if (!combinedSnippets) {
    logger.warn(
      `[Contact Research Agent] No search results for "${person.reachOutTo}".`
    );
    return { email: null };
  }

  const response = await contactFinderAgent.execute(combinedSnippets);

  if (response.error || !response.email) {
    logger.warn(
      `[Contact Research Agent] LLM failed to extract details for "${person.reachOutTo}".`
    );
    return { email: null };
  }

  logger.info(
    { details: response },
    `[Contact Research Agent] Found details for "${person.reachOutTo}".`
  );
  return response;
}