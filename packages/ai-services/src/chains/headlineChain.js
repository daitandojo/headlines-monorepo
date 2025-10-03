import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from '@langchain/core/prompts'
import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import {
  instructionHeadlines,
  shotsInputHeadlines,
  shotsOutputHeadlines,
} from '@headlines/prompts' // Correct: Import from the monorepo package
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { headlineAssessmentSchema } from '@headlines/models/schemas'
import { settings } from '@headlines/config/node' // Correct: Import from the /node entry point

const systemPrompt = [
  instructionHeadlines.whoYouAre,
  instructionHeadlines.whatYouDo,
  instructionHeadlines.primaryMandate,
  instructionHeadlines.analyticalFramework,
  instructionHeadlines.outputFormatDescription,
].join('\n\n')

const messages = [
  SystemMessagePromptTemplate.fromTemplate(systemPrompt),
  ...shotsInputHeadlines.flatMap((input, i) => [
    new HumanMessage(input),
    new AIMessage(shotsOutputHeadlines[i]),
  ]),
  HumanMessagePromptTemplate.fromTemplate('{headlineWithContext}'),
]

const prompt = ChatPromptTemplate.fromMessages(messages)
// --- DEFINITIVE FIX ---
// The chain now ends with the model. The JsonOutputParser is removed.
const chain = RunnableSequence.from([prompt, getHighPowerModel()])

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
  const input = prepareInput({ article, hits })
  const result = await safeInvoke(chain, input, 'headlineChain', headlineAssessmentSchema)

  if (result.error) {
    return {
      relevance_headline: 0,
      assessment_headline: 'AI assessment failed.',
      headline_en: article.headline,
    }
  }

  const assessment = result.assessment?.[0]
  if (assessment && hits.length > 0) {
    let score = assessment.relevance_headline
    if (settings.WATCHLIST_SCORE_BOOST > 0) {
      score = Math.min(100, score + settings.WATCHLIST_SCORE_BOOST)
      assessment.assessment_headline = `Watchlist boost (+${settings.WATCHLIST_SCORE_BOOST}). ${assessment.assessment_headline}`
    }
    assessment.relevance_headline = score
  }

  return (
    assessment || {
      relevance_headline: 0,
      assessment_headline: 'AI assessment failed.',
      headline_en: article.headline,
    }
  )
}

export const headlineChain = { invoke }
