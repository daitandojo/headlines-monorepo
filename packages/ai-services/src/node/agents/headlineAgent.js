// packages/ai-services/src/agents/headlineAgent.js
import { logger } from '@headlines/utils-shared'
import { AIAgent } from '../../lib/AIAgent.js'
import { headlineAssessmentSchema } from '@headlines/models/schemas' // CORRECTED PATH
import { settings } from '@headlines/config/node'
import {
  instructionHeadlines,
  shotsInputHeadlines,
  shotsOutputHeadlines,
} from '@headlines/prompts'

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_HEADLINE_ASSESSMENT,
    systemPrompt: instructionHeadlines,
    fewShotInputs: shotsInputHeadlines,
    fewShotOutputs: shotsOutputHeadlines,
    zodSchema: headlineAssessmentSchema,
  })

async function assessSingleHeadline(article, hits = []) {
  const headlineAssessmentAgent = getAgent()
  let headlineWithContext = `[COUNTRY CONTEXT: ${article.country}] ${article.headline}`

  if (hits.length > 0) {
    const hitStrings = hits
      .map(
        (hit) => `[WATCHLIST HIT: ${hit.entity.name} (matched on '${hit.matchedTerm}')]`
      )
      .join(' ')
    headlineWithContext = `${hitStrings} ${headlineWithContext}`
  }

  const response = await headlineAssessmentAgent.execute(headlineWithContext)

  let assessment = {
    relevance_headline: 0,
    assessment_headline: 'AI assessment failed.',
    headline_en: article.headline,
  }

  if (response && response.assessment && response.assessment.length > 0) {
    assessment = response.assessment[0]
    let score = assessment.relevance_headline
    const boost = settings.WATCHLIST_SCORE_BOOST

    if (hits.length > 0 && boost > 0) {
      score = Math.min(100, score + boost)
      assessment.assessment_headline = `Watchlist boost (+${boost}). ${assessment.assessment_headline}`
    }
    assessment.relevance_headline = score
  }

  return { ...article, ...assessment }
}

export async function assessHeadlinesInBatches(articles, articlesHits) {
  const assessmentPromises = articles.map((article, index) => {
    const hitsForArticle = articlesHits[index] || []
    return assessSingleHeadline(article, hitsForArticle)
  })

  const results = await Promise.all(assessmentPromises)
  return results
}
