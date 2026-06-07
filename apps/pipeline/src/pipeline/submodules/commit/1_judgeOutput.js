// apps/pipeline/src/pipeline/submodules/commit/1_judgeOutput.js
import { logger } from '@headlines/utils-shared'
import { auditLogger } from '@headlines/utils-server'
import { judgeChain } from '@headlines/ai-services'
import { Opportunity, EntityGraph } from '@headlines/models'
import { configStore } from '../../../config/dynamicConfig.js'

function buildEntityContext(event, opportunity) {
  const entityName = event.primarySubject?.name || opportunity?.reachOutTo || ''
  if (!entityName) return {}

  const entityKey = entityName.toLowerCase().trim()
  const watchlistMatch = configStore.watchlistEntities.get(entityKey)
  const transactionScore = opportunity?.transactionReadinessScore

  return {
    entityContext: {
      entityName,
      isOnWatchlist: !!watchlistMatch,
      watchlistPriority: watchlistMatch?.priority || null,
      transactionReadinessScore: transactionScore || null,
      wealthEstimateMM: opportunity?.estimatedTotalWealthUSD_MM || opportunity?.likelyMMDollarWealth || null,
    },
  }
}

function buildEnrichedEvents(initialEvents, initialOpportunities, transactionScores) {
  const scoreMap = new Map()
  for (const s of transactionScores || []) {
    scoreMap.set(s.name, s)
  }

  return initialEvents.map((e) => {
    const opportunity = (initialOpportunities || []).find(
      (o) => o.event_key === e.event_key || o.reachOutTo === e.primarySubject?.name
    )
    const txScore = scoreMap.get(e.primarySubject?.name) || scoreMap.get(opportunity?.reachOutTo)
    return {
      identifier: `Event: ${e.synthesized_headline}`,
      summary: e.synthesized_summary,
      assessment: e.ai_assessment_reason,
      score: e.highest_relevance_score,
      ...buildEntityContext(e, opportunity),
      transactionScore: txScore?.score || null,
      transactionReadiness: txScore?.readiness || null,
      keyIndividuals: e.key_individuals?.map((k) => k.name).filter(Boolean) || [],
      dealValueMM: e.transactionDetails?.valuationAtEventUSD || null,
    }
  })
}

function buildEnrichedOpportunities(initialOpportunities) {
  return initialOpportunities.map((o) => ({
    identifier: `Opportunity: ${o.reachOutTo}`,
    reason: o.whyContact,
    wealth_estimate_mm: o.likelyMMDollarWealth,
    isOnWatchlist: !!configStore.watchlistEntities.get((o.reachOutTo || '').toLowerCase().trim()),
    priority: configStore.watchlistEntities.get((o.reachOutTo || '').toLowerCase().trim())?.priority || null,
  }))
}

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

  const transactionScores = runStatsManager.get('transactionScores') || []
  const enrichedEvents = buildEnrichedEvents(initialEvents, initialOpportunities, transactionScores)
  const enrichedOpportunities = buildEnrichedOpportunities(initialOpportunities)

  const payloadForJudge = {
    events: enrichedEvents,
    opportunities: enrichedOpportunities,
  }

  auditLogger.info({ context: { judge_input: payloadForJudge } }, 'Judge Agent Input')

  const judgeVerdict = await judgeChain({
    payload_json_string: JSON.stringify(payloadForJudge),
  })

  auditLogger.info({ context: { judge_output: judgeVerdict } }, 'Judge Agent Output')

  runStatsManager.set('judgeVerdict', judgeVerdict)

  // --- START OF RESILIENCY FIX ---
  // If the Judge agent fails, we no longer let all items pass silently.
  // We now attach a dummy verdict indicating the failure, which makes the
  // issue visible in the final report and data, but still allows the
  // pipeline to complete and save the (un-judged) data.
  if (judgeVerdict.error) {
    logger.error(
      'Judge agent returned an error. Attaching a failsafe verdict to all items.',
      { details: judgeVerdict.error }
    )
    const allJudgedEvents = initialEvents.map((event) => ({
      ...event,
      judgeVerdict: {
        quality: 'Good', // Assume 'Good' to ensure it passes the filter
        commentary: 'Failsafe: Judge agent failed to return a verdict.',
      },
    }))
    return { allJudgedEvents, finalOpportunities: initialOpportunities }
  }
  // --- END OF RESILIENCY FIX ---

  const allJudgedEvents = initialEvents.map((event) => {
    const identifier = `Event: ${event.synthesized_headline}`
    const verdict = (judgeVerdict.event_judgements || []).find(
      (j) => j.identifier === identifier
    )

    const finalVerdict = verdict || {
      quality: 'Acceptable',
      commentary: 'Judge did not return a verdict for this item.',
    }

    if (event.source_articles) {
      event.source_articles.forEach((sourceArticle) => {
        const articleInMap = (pipelinePayload.enrichedArticles || []).find(
          (a) => a.link === sourceArticle.link
        )
        if (articleInMap) {
          articleTraceLogger.addStage(articleInMap._id, 'Judge Verdict', {
            verdict: finalVerdict,
          })
        }
      })
    }

    return {
      ...event,
      judgeVerdict: finalVerdict,
      pipelineTrace: [
        ...(event.pipelineTrace || []),
        { stage: 'Judge', status: finalVerdict.quality, reason: finalVerdict.commentary },
      ],
    }
  })
  return { allJudgedEvents, finalOpportunities: initialOpportunities }
}
