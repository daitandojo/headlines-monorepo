// packages/scraper-logic/src/ai/agents/opportunityAgent.js (version 3.2.2)
import { truncateString } from '../../../../utils/src/index.js';
import { AIAgent } from '../AIAgent.js'
import { opportunitySchema } from '../schemas/opportunitySchema.js'
import { enrichContactSchema } from '../schemas/enrichContactSchema.js'
import { env } from '../../../../config/src/index.js'
import { getInstructionOpportunities } from '../../../../prompts/src/index.js'
import { instructionEnrichContact } from '../../../../prompts/src/index.js'
import { getConfig } from '../../config.js'

const getOppAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_ARTICLE_ASSESSMENT,
    systemPrompt: getInstructionOpportunities,
    zodSchema: opportunitySchema,
  })

const getContactResolverAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_ARTICLE_ASSESSMENT,
    systemPrompt: instructionEnrichContact,
    zodSchema: enrichContactSchema,
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
        Source Article Snippets: ${truncateString(fullText, getConfig().settings.LLM_CONTEXT_MAX_CHARS)}
    `
  const response = await opportunityGeneratorAgent.execute(inputText)

  if (response.error || !response.opportunities) {
    getConfig().logger.warn(
      { event: synthesizedEvent.synthesized_headline, details: response },
      `Opportunity generation failed.`
    )
    return []
  }

  const validOpportunities = (response.opportunities || []).filter(
    (opp) => opp.likelyMMDollarWealth >= getConfig().settings.MINIMUM_EVENT_AMOUNT_USD_MILLIONS
  )

  const opportunitiesWithSource = validOpportunities.map((opp) => ({
    ...opp,
    event_key: synthesizedEvent.event_key,
    sourceArticleId: highestRelevanceArticle._id,
  }))

  getConfig().logger.info(
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
