// packages/scraper-logic/src/ai/agents/articlePreAssessmentAgent.js (version 2.2.1)
import { AIAgent } from '../AIAgent.js'
import { articlePreAssessmentSchema } from '../schemas/articlePreAssessmentSchema.js'
import { env } from '@headlines/config'
import { instructionArticlePreAssessment } from '@headlines/prompts'

const getAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_UTILITY,
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
