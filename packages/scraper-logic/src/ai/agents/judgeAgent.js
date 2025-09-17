// packages/scraper-logic/src/ai/agents/judgeAgent.js (version 2.3.2)
import { getConfig } from '../../config.js';
import { AIAgent } from '../AIAgent.js'
import { judgeSchema } from '../schemas/judgeSchema.js'
import { env } from '@headlines/config'
import { instructionJudge } from '@headlines/prompts'

const getAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_SYNTHESIS,
    systemPrompt: instructionJudge,
    zodSchema: judgeSchema,
  })

export async function judgePipelineOutput(events, opportunities) {
  const judgeAgent = getAgent()
  if ((!events || events.length === 0) && (!opportunities || opportunities.length === 0)) {
    return {
      event_judgements: [],
      opportunity_judgements: [],
    }
  }
  getConfig().logger.info('⚖️ [Judge Agent] Reviewing final pipeline output for quality control...')
  const lightweightEvents = (events || []).map((e) => ({
    identifier: `Event: ${e.synthesized_headline}`,
    summary: e.synthesized_summary,
    assessment: e.ai_assessment_reason,
    score: e.highest_relevance_score,
  }))
  const lightweightOpportunities = (opportunities || []).map((o) => ({
    identifier: `Opportunity: ${o.reachOutTo}`,
    reason: o.whyContact,
    wealth_estimate_mm: o.likelyMMDollarWealth,
  }))
  const inputText = JSON.stringify({
    events: lightweightEvents,
    opportunities: lightweightOpportunities,
  })
  const response = await judgeAgent.execute(inputText)
  if (response.error) {
    getConfig().logger.error({ details: response }, 'Judge Agent failed to produce a verdict.')
    // Return a default "empty" verdict on failure to avoid crashing the pipeline
    return {
      event_judgements: [],
      opportunity_judgements: [],
    }
  }
  getConfig().logger.info(
    { details: response },
    '[Judge Agent] Successfully produced quality control verdicts.'
  )
  return response
}
