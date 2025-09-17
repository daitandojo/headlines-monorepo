// src/lib/rag/planner.js (version 1.2)
'use server'

import { callGroqWithRetry } from '@/lib/groq'
import { PLANNER_PROMPT } from './prompts'

const PLANNER_MODEL = 'llama3-70b-8192'

/**
 * A resilient parser that attempts to fix common LLM-induced JSON errors.
 * @param {string} jsonString - The potentially malformed JSON string from the LLM.
 * @returns {object} A valid JavaScript object.
 * @throws {Error} If the JSON is irreparable.
 */
function resilientJSONParse(jsonString) {
  try {
    return JSON.parse(jsonString)
  } catch (e) {
    console.warn('[Planner Agent] Initial JSON.parse failed. Attempting cleanup.', e.message)
    // Attempt to fix common errors, like unescaped quotes in search queries
    let cleanedString = jsonString.replace(/""/g, '"\\"')

    // Find the start and end of the JSON object
    const startIndex = cleanedString.indexOf('{')
    const endIndex = cleanedString.lastIndexOf('}')
    if (startIndex === -1 || endIndex === -1) {
      throw new Error('Could not find a valid JSON object in the string.')
    }
    cleanedString = cleanedString.substring(startIndex, endIndex + 1)

    try {
      return JSON.parse(cleanedString)
    } catch (finalError) {
      console.error('[Planner Agent] Resilient JSON parsing failed.', finalError.message)
      throw new Error('Failed to parse LLM JSON response after cleanup.')
    }
  }
}

/**
 * Runs the Planner Agent to decompose the user's query into a logical plan
 * and a set of optimized search queries.
 * @param {Array<object>} messages - The conversation history.
 * @returns {Promise<object>} An object containing the plan and search queries.
 */
export async function runPlannerAgent(messages) {
  const userQuery = messages[messages.length - 1].content
  const conversationHistory =
    messages.length > 1
      ? messages
          .slice(-5, -1)
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n')
      : 'No history.'

  const prompt = PLANNER_PROMPT.replace(
    '{CONVERSATION_HISTORY}',
    conversationHistory
  ).replace('{USER_QUERY}', userQuery)

  console.log('[Planner Agent] Generating plan...')
  const response = await callGroqWithRetry({
    model: PLANNER_MODEL,
    messages: [{ role: 'system', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.0,
  })

  const rawContent = response.choices[0].message.content
  const planObject = resilientJSONParse(rawContent)

  console.groupCollapsed('[Planner Agent] Plan Generated')
  console.log('User Query:', planObject.user_query)
  console.log('Reasoning:', planObject.reasoning)
  console.log('Plan Steps:', planObject.plan)
  console.log('Search Queries:', planObject.search_queries)
  console.groupEnd()

  return planObject
}