// apps/pipeline/src/pipeline/submodules/commit/1_judgeOutput.js (with Enhanced Audit Logging)
import { logger } from '@headlines/utils-shared'
import { auditLogger } from '@headlines/utils-server'
import { judgeChain } from '@headlines/ai-services'

export async function judgeAndFilterOutput(pipelinePayload, fatalQualities) {
  const {
    synthesizedEvents: initialEvents = [],
    opportunitiesToSave: initialOpportunities = [],
    runStatsManager,
    articleTraceLogger,
  } = pipelinePayload

  logger.info(
    `[Judge Agent] Received ${initialEvents.length} events and ${initialOpportunities.length} opportunities for final review.`
  )

  const lightweightEvents = initialEvents.map((e) => ({
    identifier: `Event: ${e.synthesized_headline}`,
    summary: e.synthesized_summary,
    assessment: e.ai_assessment_reason,
    score: e.highest_relevance_score,
  }))
  const lightweightOpportunities = initialOpportunities.map((o) => ({
    identifier: `Opportunity: ${o.reachOutTo}`,
    reason: o.whyContact,
    wealth_estimate_mm: o.likelyMMDollarWealth,
  }))

  const payloadForJudge = {
    events: lightweightEvents,
    opportunities: lightweightOpportunities,
  }

  auditLogger.info({ context: { judge_input: payloadForJudge } }, 'Judge Agent Input')

  const judgeVerdict = await judgeChain({
    payload_json_string: JSON.stringify(payloadForJudge),
  })

  auditLogger.info({ context: { judge_output: judgeVerdict } }, 'Judge Agent Output')

  runStatsManager.set('judgeVerdict', judgeVerdict)

  if (judgeVerdict.error) {
    logger.error(
      'Judge agent returned an error. Allowing all items to pass as a failsafe.',
      { details: judgeVerdict.error }
    )
    return { finalEvents: initialEvents, finalOpportunities: initialOpportunities }
  }

  initialEvents.forEach((event) => {
    const identifier = `Event: ${event.synthesized_headline}`
    const verdict = judgeVerdict.event_judgements.find((j) => j.identifier === identifier)
    if (verdict) {
      event.source_articles.forEach((sourceArticle) => {
        const articleInMap = (pipelinePayload.enrichedArticles || []).find(
          (a) => a.link === sourceArticle.link
        )
        if (articleInMap) {
          articleTraceLogger.addStage(articleInMap._id, 'Judge Verdict', { verdict })
        }
      })
    }
  })

  const fatalQualitiesSet = new Set(fatalQualities)

  const approvedEventIdentifiers = new Set(
    (judgeVerdict?.event_judgements || [])
      .filter((j) => !fatalQualitiesSet.has(j.quality))
      .map((j) => j.identifier)
  )

  const finalEvents = initialEvents.filter((event) => {
    const identifier = `Event: ${event.synthesized_headline}`
    const wasApproved = approvedEventIdentifiers.has(identifier)
    if (!wasApproved) {
      const verdict = judgeVerdict.event_judgements.find(
        (j) => j.identifier === identifier
      )
      logger.warn(
        { event: event.synthesized_headline, verdict: verdict },
        `Event discarded by Judge's final verdict.`
      )
    }
    return wasApproved
  })

  logger.info(
    `[Judge Agent] Verdict complete. Approved ${finalEvents.length} out of ${initialEvents.length} events.`
  )

  const finalOpportunities = initialOpportunities

  return { finalEvents, finalOpportunities }
}
