// This file is a standard server-side JavaScript module.
// It does NOT contain environment-specific directives.

import { AIAgent } from '../lib/AIAgent.js'
import { articlePreAssessmentSchema } from '../schemas/articlePreAssessmentSchema.js'
import { settings } from '@headlines/config/node'
import { instructionArticlePreAssessment } from '@headlines/prompts'

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_UTILITY,
    systemPrompt: instructionArticlePreAssessment,
    zodSchema: articlePreAssessmentSchema,
  })

export async function preAssessArticle(articleContent) {
  const articlePreAssessmentAgent = getAgent()
  const response = await articlePreAssessmentAgent.execute(articleContent)
  if (response.error) {
    return { classification: null, error: response.error }
  }
  return response
}
