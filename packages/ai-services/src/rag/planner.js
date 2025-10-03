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

  // --- START OF THE FIX ---
  // Replaced browser-specific logger.groupCollapsed with a single structured log object.
  // This is safe to run on the server.
  logger.trace(
    {
      agent: 'Planner Agent',
      planDetails: {
        userQuery: response.user_query,
        reasoning: response.reasoning,
        planSteps: response.plan,
        searchQueries: response.search_queries,
      },
    },
    '[Planner Agent] Plan Generated'
  )
  // --- END OF THE FIX ---

  return response
}
