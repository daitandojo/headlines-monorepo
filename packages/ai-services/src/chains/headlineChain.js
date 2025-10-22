// packages/ai-services/src/chains/headlineChain.js
import { AIAgent } from '../lib/AIAgent.js'
import { headlineAssessmentSchema } from '@headlines/models/schemas'
import { settings } from '@headlines/config'
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

function prepareInput({ article, hits }) {
  let headlineWithContext = `[COUNTRY CONTEXT: ${article.country}] ${article.headline}`
  if (hits.length > 0) {
    const hitStrings = hits
      .map(
        (hit) => `[WATCHLIST HIT: ${hit.entity.name} (matched on '${hit.matchedTerm}')]`
      )
      .join(' ')
    headlineWithContext = `${hitStrings} ${headlineWithContext}`
  }
  return { headlineWithContext }
}

async function invoke({ article, hits }) {
  const agent = getAgent()
  const { headlineWithContext } = prepareInput({ article, hits })

  // The agent expects a single string of user content
  const response = await agent.execute(headlineWithContext)

  // Default response in case of total failure
  const fallbackAssessment = {
    relevance_headline: 0,
    assessment_headline: 'AI assessment failed.',
    headline_en: article.headline,
  }

  if (response.error || !response.assessment || response.assessment.length === 0) {
    return fallbackAssessment
  }

  // The schema ensures assessment is an array, but we only sent one headline
  const assessment = response.assessment[0]

  if (hits.length > 0) {
    const boost = settings.WATCHLIST_SCORE_BOOST
    if (boost > 0) {
      assessment.relevance_headline = Math.min(100, assessment.relevance_headline + boost)
      assessment.assessment_headline = `Watchlist boost (+${boost}). ${assessment.assessment_headline}`
    }
  }

  return assessment || fallbackAssessment
}

export const headlineChain = { invoke }
