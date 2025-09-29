'use server'

import { truncateString } from '@headlines/utils-shared'
import { logger } from '@headlines/utils-server/node'
import { AIAgent } from '../lib/AIAgent.js'
import { articleAssessmentSchema } from '../schemas/articleAssessmentSchema.js'
import { settings } from '@headlines/config/node'
import {
  getInstructionArticle,
  shotsInputArticle,
  shotsOutputArticle,
} from '@headlines/prompts'

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_ARTICLE_ASSESSMENT,
    systemPrompt: getInstructionArticle,
    fewShotInputs: shotsInputArticle,
    fewShotOutputs: shotsOutputArticle,
    zodSchema: articleAssessmentSchema,
  })

// The agent now accepts `hits` as a parameter, breaking the circular dependency.
// It is no longer responsible for fetching data.
export async function assessArticleContent(article, hits = [], isSalvaged = false) {
  const articleAssessmentAgent = getAgent()
  const fullContent = (article.articleContent?.contents || []).join('\n')
  const truncatedContent = truncateString(fullContent, settings.LLM_CONTEXT_MAX_CHARS)

  if (fullContent.length > settings.LLM_CONTEXT_MAX_CHARS) {
    logger.warn(
      {
        originalLength: fullContent.length,
        truncatedLength: truncatedContent.length,
        limit: settings.LLM_CONTEXT_MAX_CHARS,
      },
      `Article content for LLM was truncated to prevent context overload.`
    )
  }

  let articleText = `HEADLINE: ${article.headline}\n\nBODY:\n${truncatedContent}`

  if (hits.length > 0) {
    const hitStrings = hits.map(
      (hit) => `[WATCHLIST HIT: ${hit.name} | CONTEXT: ${hit.context || 'N/A'}]`
    )
    const hitPrefix = hitStrings.join(' ')
    articleText = `${hitPrefix} ${articleText}`
    logger.info({ hits: hits.map((h) => h.name) }, 'Watchlist entities found in article.')
  }

  if (isSalvaged) {
    articleText = `[SALVAGE CONTEXT: The original source for this headline failed to scrape. This content is from an alternative source. Please assess based on this new context.]\n\n${articleText}`
  }

  const response = await articleAssessmentAgent.execute(articleText)

  if (response.error) {
    logger.error(
      { article: { link: article.link }, details: response },
      `Article assessment failed for ${article.link}.`
    )
    return { ...article, error: `AI Error: ${response.error}` }
  }

  if (
    response.amount > 0 &&
    response.amount < settings.MINIMUM_EVENT_AMOUNT_USD_MILLIONS
  ) {
    response.relevance_article = 10
    response.assessment_article = `Dropped: Amount ($${response.amount}M) is below the financial threshold of $${settings.MINIMUM_EVENT_AMOUNT_USD_MILLIONS}M.`
  }

  return { ...article, ...response, error: null }
}
