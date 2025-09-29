import { logger } from '@headlines/utils-server/node'
import { AIAgent } from '../lib/AIAgent.js'
import { headlineAssessmentSchema } from '../schemas/headlineAssessmentSchema.js'
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

// This agent now accepts pre-calculated hits. It no longer fetches data.
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

  // Define a default assessment object for fallback
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

// The batching function now needs to accept hits for each article.
// We'll pass an array of `hits` arrays.
export async function assessHeadlinesInBatches(articles, articlesHits) {
  const assessmentPromises = articles.map((article, index) => {
    const hitsForArticle = articlesHits[index] || []
    return assessSingleHeadline(article, hitsForArticle)
  })

  const results = await Promise.all(assessmentPromises)
  return results
}
