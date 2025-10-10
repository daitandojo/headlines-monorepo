// packages/ai-services/src/node/agents/articlePreAssessmentAgent.js
import { AIAgent } from '../../lib/AIAgent.js'
import { articlePreAssessmentSchema } from '@headlines/models/schemas'
import { settings } from '@headlines/config/node'
import { instructionArticlePreAssessment } from '@headlines/prompts'

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_UTILITY,
    systemPrompt: instructionArticlePreAssessment,
    zodSchema: articlePreAssessmentSchema,
  })

export async function preAssessArticle(articleContent, hits = []) {
  const articlePreAssessmentAgent = getAgent()

  let userContent = `[ARTICLE TEXT]:\n${articleContent}`

  if (hits.length > 0) {
    const hitNames = hits.map((h) => h.entity.name).join(', ')
    const contextHeader = `[CONTEXT]: This article mentions the following watchlist entities of high importance to our firm: ${hitNames}. Evaluate the article with this in mind.\n\n`
    userContent = contextHeader + userContent
  }

  const response = await articlePreAssessmentAgent.execute(userContent)

  if (response.error) {
    return { classification: null, error: response.error }
  }
  return response
}
