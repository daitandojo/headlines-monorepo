// packages/ai-services/src/agents/opportunityAgent.js
import { truncateString } from '@headlines/utils-shared'
import { logger } from '@headlines/utils-shared'
import { AIAgent } from '../../lib/AIAgent.js'
import { opportunitySchema } from '@headlines/models/schemas' // CORRECTED PATH
import { settings, LLM_CONTEXT_MAX_CHARS } from '@headlines/config/node'
import { getInstructionOpportunities } from '@headlines/prompts'

const getOppAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_ARTICLE_ASSESSMENT,
    systemPrompt: getInstructionOpportunities,
    zodSchema: opportunitySchema,
  })

export async function generateOpportunitiesFromEvent(
  synthesizedEvent,
  articlesInCluster
) {
  const opportunityGeneratorAgent = getOppAgent()

  const highestRelevanceArticle = articlesInCluster.reduce((max, current) =>
    (current.relevance_article || 0) > (max.relevance_article || 0) ? current : max
  )

  const fullText = articlesInCluster
    .map((a) => (a.articleContent?.contents || []).join('\n'))
    .join('\n\n')

  const inputText = `
        Synthesized Event Headline: ${synthesizedEvent.synthesized_headline}
        Synthesized Event Summary: ${synthesizedEvent.synthesized_summary}
        Key Individuals already identified: ${JSON.stringify(synthesizedEvent.key_individuals)}
        Source Article Snippets: ${truncateString(fullText, LLM_CONTEXT_MAX_CHARS)}
    `

  const response = await opportunityGeneratorAgent.execute(inputText)

  if (response.error || !response.opportunities) {
    logger.warn(
      { event: synthesizedEvent.synthesized_headline, details: response },
      `Opportunity generation failed.`
    )
    return []
  }

  const validOpportunities = (response.opportunities || []).filter(
    (opp) =>
      opp.likelyMMDollarWealth === null || // Keep opportunities where wealth is unknown
      opp.likelyMMDollarWealth >= settings.MINIMUM_EVENT_AMOUNT_USD_MILLIONS
  )

  const opportunitiesWithSource = validOpportunities.map((opp) => ({
    ...opp,
    event_key: synthesizedEvent.event_key,
    sourceArticleId: highestRelevanceArticle._id,
  }))

  logger.info(
    { details: opportunitiesWithSource },
    `[Opportunity Agent] Generated ${
      opportunitiesWithSource.length
    } opportunity/ies from event "${truncateString(
      synthesizedEvent.synthesized_headline,
      50
    )}"`
  )
  return opportunitiesWithSource
}
