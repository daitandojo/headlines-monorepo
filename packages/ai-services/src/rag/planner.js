// File: packages/ai-services/src/rag/planner.js (Unabridged and Corrected)

'use server'

import { callLanguageModel } from '../lib/langchain.js'
import { PLANNER_PROMPT } from './prompts.js'
import { settings } from '@headlines/config'

const PLANNER_MODEL = settings.LLM_MODEL_UTILITY

export async function runPlannerAgent(messages) {
  const conversationText = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  console.log(`[Planner Agent] Generating plan with ${PLANNER_MODEL}...`)

  const response = await callLanguageModel({
    modelName: PLANNER_MODEL,
    systemPrompt: PLANNER_PROMPT,
    userContent: conversationText,
    isJson: true,
  })

  if (response.error) {
    throw new Error(`Planner Agent failed: ${response.error}`)
  }

  const planObject = response

  console.groupCollapsed('[Planner Agent] Plan Generated')
  console.log('User Query:', planObject.user_query)
  console.log('Reasoning:', planObject.reasoning)
  console.log('Plan Steps:', planObject.plan)
  console.log('Search Queries:', planObject.search_queries)
  console.groupEnd()

  return planObject
}
