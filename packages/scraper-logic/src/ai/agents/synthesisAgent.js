// packages/scraper-logic/src/ai/agents/synthesisAgent.js (version 3.0.2)
import { truncateString } from '../../../../utils/src/index.js'
import { AIAgent } from '../AIAgent.js'
import { synthesisSchema } from '../schemas/synthesisSchema.js'
import { env } from '../../../../config/src/index.js'
import { instructionSynthesize } from '../../../../prompts/src/index.js'
// DEFINITIVE FIX: Removed the duplicate import of getConfig.
import { getConfig } from '../../config.js'

const getAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_SYNTHESIS,
    systemPrompt: instructionSynthesize,
    zodSchema: synthesisSchema,
  })

export async function synthesizeEvent(
  articlesInCluster,
  historicalContext,
  wikipediaContext,
  newsApiContext,
  gdeltContext
) {
  const eventSynthesizerAgent = getAgent()
  const config = getConfig()

  const todayPayload = articlesInCluster.map((a) => ({
    headline: a.headline,
    source: a.newspaper,
    full_text: truncateString(
      (a.articleContent?.contents || []).join('\n'),
      getConfig().settings.LLM_CONTEXT_MAX_CHARS / articlesInCluster.length
    ),
    key_individuals: a.key_individuals || [],
  }))

  const historyPayload = historicalContext.map((h) => ({
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
    '[ GLOBAL GDELT CONTEXT ]': gdeltContext || 'Not available.',
  }

  getConfig().logger.trace(
    { synthesis_context: userContent },
    '--- SYNTHESIS CONTEXT ---'
  )

  const response = await eventSynthesizerAgent.execute(JSON.stringify(userContent))

  if (response.error) {
    getConfig().logger.error('Failed to synthesize event.', { response })
    return { error: 'Synthesis failed' }
  }
  return response
}

export async function synthesizeFromHeadline(article) {
  const eventSynthesizerAgent = getAgent()
  getConfig().logger.warn(
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
    '[ GLOBAL GDELT CONTEXT ]': 'Not available.',
  }

  getConfig().logger.trace(
    { synthesis_context: userContent },
    '--- SALVAGE SYNTHESIS CONTEXT ---'
  )

  const response = await eventSynthesizerAgent.execute(JSON.stringify(userContent))

  if (response.error) {
    getConfig().logger.error('Failed to salvage headline.', { response })
    return null
  }
  return response
}
