import { truncateString } from '@headlines/utils-shared'
import { logger } from '@headlines/utils-server/node'
import { AIAgent } from '../lib/AIAgent.js'
import { synthesisSchema } from '../schemas/synthesisSchema.js'
import { settings, LLM_CONTEXT_MAX_CHARS } from '@headlines/config/node'
import { instructionSynthesize } from '@headlines/prompts'

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_SYNTHESIS,
    systemPrompt: [
      instructionSynthesize.whoYouAre,
      instructionSynthesize.whatYouDo,
      ...instructionSynthesize.guidelines,
      instructionSynthesize.outputFormatDescription,
    ].join('\n\n'),
    zodSchema: synthesisSchema,
  })

export async function synthesizeEvent(
  articlesInCluster,
  historicalContext,
  wikipediaContext,
  newsApiContext
  // gdeltContext is no longer used, so it's removed.
) {
  const eventSynthesizerAgent = getAgent()

  const todayPayload = articlesInCluster.map((a) => ({
    headline: a.headline,
    source: a.newspaper,
    full_text: truncateString(
      (a.articleContent?.contents || []).join('\n'),
      // Use a safe division, prevent division by zero.
      LLM_CONTEXT_MAX_CHARS / (articlesInCluster.length || 1)
    ),
    key_individuals: a.key_individuals || [],
  }))

  const historyPayload = (historicalContext || []).map((h) => ({
    headline: h.headline,
    source: h.newspaper,
    published: h.createdAt,
    summary: h.assessment_article || '',
  }))

  const userContent = {
    "[ TODAY'S NEWS ]": todayPayload,
    '[ HISTORICAL CONTEXT (Internal Database) ]': historyPayload,
    '[ PUBLIC WIKIPEDIA CONTEXT ]': wikipediaContext || 'Not available.',
    '[ LATEST NEWS CONTEXT (NewsAPI) ]': newsApiContext || 'Not available.',
  }

  logger.trace({ synthesis_context: userContent }, '--- SYNTHESIS CONTEXT ---')

  const response = await eventSynthesizerAgent.execute(JSON.stringify(userContent))

  if (response.error) {
    logger.error('Failed to synthesize event.', { response })
    return { error: 'Synthesis failed' }
  }
  return response
}

export async function synthesizeFromHeadline(article) {
  const eventSynthesizerAgent = getAgent()
  logger.warn(
    { headline: article.headline },
    `Salvaging high-signal headline with failed enrichment...`
  )

  const todayPayload = [
    {
      headline: article.headline,
      source: article.newspaper,
      full_text:
        "NOTE: Full article text could not be retrieved. Synthesize based on the headline's explicit claims and your general knowledge.",
      key_individuals: article.key_individuals || [],
    },
  ]

  const userContent = {
    "[ TODAY'S NEWS ]": todayPayload,
    '[ HISTORICAL CONTEXT ]': [],
    '[ PUBLIC WIKIPEDIA CONTEXT ]': 'Not available.',
    '[ LATEST NEWS CONTEXT (NewsAPI) ]': 'Not available.',
  }

  logger.trace({ synthesis_context: userContent }, '--- SALVAGE SYNTHESIS CONTEXT ---')

  const response = await eventSynthesizerAgent.execute(JSON.stringify(userContent))

  if (response.error) {
    logger.error('Failed to salvage headline.', { response })
    return null
  }
  return response
}
