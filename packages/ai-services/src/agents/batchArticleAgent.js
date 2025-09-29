// This is a standard server-side module, do not add environment-specific directives.

import { logger } from '@headlines/utils-server/node'
import { AIAgent } from '../lib/AIAgent.js'
import { batchArticleAssessmentSchema } from '../schemas/batchArticleAssessmentSchema.js'
import { settings, AI_BATCH_SIZE } from '@headlines/config/node'
import { getInstructionBatchArticleAssessment } from '@headlines/prompts'
import { assessArticleContent } from './articleAgent.js' // The fallback single-article agent

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_ARTICLE_ASSESSMENT,
    systemPrompt: getInstructionBatchArticleAssessment,
    zodSchema: batchArticleAssessmentSchema,
  })

export async function batchAssessArticles(articles) {
  if (!articles || articles.length === 0) return []

  const batchAgent = getAgent()
  const articleBatches = []
  // Use the centralized batch size from config
  for (let i = 0; i < articles.length; i += AI_BATCH_SIZE) {
    articleBatches.push(articles.slice(i, i + AI_BATCH_SIZE))
  }

  const allResults = []

  for (const batch of articleBatches) {
    const payload = batch.map((article) => ({
      headline: article.headline,
      content: (article.articleContent?.contents || []).join('\n'),
    }))

    const response = await batchAgent.execute(JSON.stringify(payload))

    if (
      response.error ||
      !response.assessments ||
      response.assessments.length !== batch.length
    ) {
      logger.error(
        {
          details: response,
          expectedCount: batch.length,
          receivedCount: response.assessments?.length,
        },
        'Batch assessment failed or returned mismatched count. Falling back to single-article processing for this batch.'
      )

      // The fallback now correctly calls the refactored single-article agent
      const fallbackPromises = batch.map((article) => assessArticleContent(article))
      const fallbackResults = await Promise.all(fallbackPromises)
      allResults.push(...fallbackResults)
      continue
    }

    const mergedResults = batch.map((originalArticle, index) => ({
      ...originalArticle,
      ...response.assessments[index],
    }))
    allResults.push(...mergedResults)
  }

  return allResults
}
