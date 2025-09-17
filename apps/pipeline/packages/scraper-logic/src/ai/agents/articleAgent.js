// packages/scraper-logic/src/ai/agents/articleAgent.js (version 3.4.1)
import { truncateString } from '@headlines/utils';
import { AIAgent } from '../AIAgent.js'
import { articleAssessmentSchema } from '../schemas/articleAssessmentSchema.js'
import { env } from '@headlines/config'
import { getInstructionArticle } from '@headlines/prompts'
import { shotsInputArticle } from '@headlines/prompts'
import { shotsOutputArticle } from '@headlines/prompts'
import { getConfig } from '../../config.js'

const getAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_ARTICLE_ASSESSMENT,
    systemPrompt: getInstructionArticle,
    fewShotInputs: shotsInputArticle,
    fewShotOutputs: shotsOutputArticle,
    zodSchema: articleAssessmentSchema,
  })

function findWatchlistHits(text, country) {
  const hits = []
  const lowerText = text.toLowerCase()
  const config = getConfig();
  if (!config.configStore) return []

  for (const entity of config.configStore.watchlistEntities.values()) {
      if (entity.country && entity.country !== country && entity.country !== 'Global PE' && entity.country !== 'M&A Aggregators') {
          continue;
      }

      const terms = [entity.name.toLowerCase(), ...(entity.searchTerms || [])]
      for (const term of terms) {
          if (term.length > 3 && lowerText.includes(term)) {
              hits.push(entity)
              break; 
          }
      }
  }
  return [...new Map(hits.map((item) => [item['name'], item])).values()]
}

export async function assessArticleContent(article, isSalvaged = false) {
  const articleAssessmentAgent = getAgent()
  const fullContent = (article.articleContent?.contents || []).join('\n')
  const truncatedContent = truncateString(fullContent, getConfig().settings.LLM_CONTEXT_MAX_CHARS)

  if (fullContent.length > getConfig().settings.LLM_CONTEXT_MAX_CHARS) {
    getConfig().logger.warn(
      {
        originalLength: fullContent.length,
        truncatedLength: truncatedContent.length,
        limit: getConfig().settings.LLM_CONTEXT_MAX_CHARS,
      },
      `Article content for LLM was truncated to prevent context overload.`
    )
  }

  const combinedTextForHitCheck = `${article.headline}\n${truncatedContent}`
  const hits = findWatchlistHits(combinedTextForHitCheck, article.country)
  let articleText = `HEADLINE: ${article.headline}\n\nBODY:\n${truncatedContent}`

  if (hits.length > 0) {
    const hitStrings = hits.map((hit) => `[WATCHLIST HIT: ${hit.name} | CONTEXT: ${hit.context || 'N/A'}]`)
    const hitPrefix = hitStrings.join(' ')
    articleText = `${hitPrefix} ${articleText}`
    getConfig().logger.info({ hits: hits.map((h) => h.name) }, 'Watchlist entities found in article content.')
  }
  
  if (isSalvaged) {
      articleText = `[SALVAGE CONTEXT: The original source for this headline failed to scrape. This content is from an alternative source. Please assess based on this new context.]\n\n${articleText}`;
  }

  const response = await articleAssessmentAgent.execute(articleText)

  if (response.error) {
    getConfig().logger.error(
      { article: { link: article.link }, details: response },
      `Article assessment failed for ${article.link}.`
    )
    return { ...article, error: `AI Error: ${response.error}` }
  }

  if (response.amount > 0 && response.amount < getConfig().settings.MINIMUM_EVENT_AMOUNT_USD_MILLIONS) {
      response.relevance_article = 10;
      response.assessment_article = `Dropped: Amount ($${response.amount}M) is below the financial threshold of $${getConfig().settings.MINIMUM_EVENT_AMOUNT_USD_MILLIONS}M.`
  }

  return { ...article, ...response, error: null }
}
