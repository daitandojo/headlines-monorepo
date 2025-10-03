// packages/ai-services/src/rag/planner.js
import { callLanguageModel } from '../lib/langchain.js'
import { PLANNER_PROMPT } from './prompts.js'
import { settings } from '@headlines/config'
import { logger } from '@headlines/utils-shared'

const PLANNER_MODEL = settings.LLM_MODEL_UTILITY

export async function runPlannerAgent(messages) {
  const conversationText = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  logger.info(`[Planner Agent] Generating plan with ${PLANNER_MODEL}...`)

  const response = await callLanguageModel({
    modelName: PLANNER_MODEL,
    systemPrompt: PLANNER_PROMPT,
    userContent: conversationText,
    isJson: true,
  })

  if (response.error) {
    throw new Error(`Planner Agent failed: ${response.error}`)
  }

  logger.groupCollapsed('[Planner Agent] Plan Generated')
  logger.trace('User Query:', response.user_query)
  logger.trace('Reasoning:', response.reasoning)
  logger.trace('Plan Steps:', response.plan)
  logger.trace('Search Queries:', response.search_queries)
  logger.groupEnd()

  return response
}
