// packages/ai-services/src/node/agents/articleAgent.js
import { truncateString } from '@headlines/utils-shared'
import { logger } from '@headlines/utils-shared'
import { AIAgent } from '../../lib/AIAgent.js'
import { articleAssessmentSchema } from '@headlines/models/schemas'
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

export async function assessArticleContent(
  article,
  hits = [],
  isSalvaged = false,
  externalContext = ''
) {
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
      `Article content for LLM was truncated.`
    )
  }

  let articleText = `HEADLINE: ${article.headline}\n\nBODY:\n${article.headline}\n\n${truncatedContent}`

  if (hits.length > 0) {
    const hitStrings = hits.map(
      (hit) =>
        `[WATCHLIST HIT: ${hit.entity.name} | CONTEXT: ${hit.entity.context || 'N/A'}]`
    )
    const hitPrefix = hitStrings.join(' ')
    articleText = `${hitPrefix} ${articleText}`
    logger.info(
      { hits: hits.map((h) => h.entity.name) },
      'Watchlist entities found in article.'
    )
  }

  if (isSalvaged) {
    articleText = `[SALVAGE CONTEXT: The original source for this headline failed to scrape. This content is from an alternative source. Please assess based on this new context.]\n\n${articleText}`
  }

  if (externalContext) {
    articleText = `[EXTERNAL CONTEXT FROM WEB SEARCH]:\n${externalContext}\n\n[ORIGINAL ARTICLE DATA]:\n${articleText}`
  }

  const response = await articleAssessmentAgent.execute(articleText)

  if (response.error) {
    logger.error(
      { article: { link: article.link }, details: response },
      `Article assessment failed for ${article.link}.`
    )
    return { ...article, error: `AI Error: ${response.error}` }
  }

  // --- START OF DEFINITIVE FIX ---
  // The AI can sometimes hallucinate individuals not present in the text. This filter ensures that only
  // individuals who are actually mentioned in the article body are included in the final output.
  if (response.key_individuals && response.key_individuals.length > 0) {
    const articleTextLower = articleText.toLowerCase()
    response.key_individuals = response.key_individuals.filter((ind) => {
      if (!ind || !ind.name) return false // Filter out null/undefined entries
      const isPresent = ind.name
        .split(' ')
        .filter((p) => p.length > 2)
        .some((p) => articleTextLower.includes(p.toLowerCase()))
      if (!isPresent) {
        logger.warn(
          { individual: ind.name, article: article.headline },
          'Discarding hallucinated key individual not present in article text.'
        )
      }
      return isPresent
    })
  }
  // --- END OF DEFINITIVE FIX ---

  if (
    response.amount > 0 &&
    response.amount < settings.MINIMUM_EVENT_AMOUNT_USD_MILLIONS
  ) {
    response.relevance_article = 10
    response.assessment_article = `Dropped: Amount ($${response.amount}M) is below the financial threshold of $${settings.MINIMUM_EVENT_AMOUNT_USD_MILLIONS}M.`
  }

  return { ...article, ...response, error: null }
}
