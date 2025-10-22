// apps/pipeline/src/pipeline/5_commitAndNotify.js
import { logger } from '@headlines/utils-shared'
import { auditLogger } from '@headlines/utils-server'
import { sendSupervisorReportEmail } from '../modules/email/index.js'
import { judgeAndFilterOutput } from './submodules/commit/1_judgeOutput.js'
import { saveResultsToDb } from './submodules/commit/2_saveResults.js'
import { triggerNotifications } from './submodules/commit/3_triggerNotifications.js'

const FATAL_JUDGEMENT_QUALITIES = ['Irrelevant', 'Poor']

function shouldSkipCommits(payload) {
  return payload.noCommitMode || payload.isDryRun
}

function canProceedWithCommits(payload) {
  const runStats = payload.runStatsManager.getStats()
  return payload.dbConnection && (!runStats.errors || runStats.errors.length === 0)
}

function isEventApproved(event, fatalQualities) {
  const quality = event.judgeVerdict?.quality
  return quality && !fatalQualities.includes(quality)
}

function filterApprovedEvents(events, fatalQualities) {
  const approvedEvents = []
  for (const event of events) {
    if (isEventApproved(event, fatalQualities)) {
      approvedEvents.push(event)
    } else {
      logger.warn(
        { event: event.synthesized_headline, verdict: event.judgeVerdict },
        "Event discarded by Judge's final verdict"
      )
    }
  }
  return approvedEvents
}

function createSaveSummary(totalEvents, approvedEvents, savedOpportunities) {
  return `Database Save Summary: ${totalEvents} total events processed, ${approvedEvents} approved, ${savedOpportunities} opportunities committed.`
}

function hasItemsToNotify(savedEvents, savedOpportunities) {
  return savedEvents.length > 0 || (savedOpportunities && savedOpportunities.length > 0)
}

function createNotificationMessage(eventCount, opportunityCount) {
  return `Triggering notifications for ${eventCount} approved/committed events and ${opportunityCount} committed opportunities.`
}

async function handleSkipCommitMode(payload) {
  logger.warn(
    'COMMIT/NOTIFY: Skipping database commits and user notifications due to run flags.'
  )
  if (!payload.isDryRun) {
    const runStats = payload.runStatsManager.getStats()
    await sendSupervisorReportEmail(runStats, payload.articleTraceLogger.getAllTraces())
  }
}

async function executeJudgeAndFilter(payload) {
  return judgeAndFilterOutput(payload, FATAL_JUDGEMENT_QUALITIES)
}

async function processAndSave(payload, allJudgedEvents, approvedEvents, opportunities) {
  const saveResults = await saveResultsToDb(
    payload,
    allJudgedEvents,
    opportunities,
    approvedEvents
  )
  logger.info(
    createSaveSummary(
      allJudgedEvents.length,
      approvedEvents.length,
      saveResults.savedOpportunities.length
    )
  )
  return saveResults
}

async function executeNotifications(payload, savedEvents, savedOpportunities) {
  if (hasItemsToNotify(savedEvents, savedOpportunities)) {
    logger.info(createNotificationMessage(savedEvents.length, savedOpportunities.length))
    await triggerNotifications(payload, savedEvents, savedOpportunities)
  } else {
    logger.info('No new items were approved by the Judge. Skipping user notifications.')
  }
}

async function sendFinalReports(payload) {
  const runStats = payload.runStatsManager.getStats()
  auditLogger.info({ context: { run_stats: runStats } }, 'Final Run Statistics')
  await sendSupervisorReportEmail(runStats, payload.articleTraceLogger.getAllTraces())
}

function updatePayloadWithResults(payload, savedEvents, savedOpportunities) {
  payload.savedEvents = savedEvents
  payload.savedOpportunities = savedOpportunities
}

export async function runCommitAndNotify(pipelinePayload) {
  logger.info('--- STAGE 5: COMMIT & NOTIFY ---')

  if (shouldSkipCommits(pipelinePayload)) {
    await handleSkipCommitMode(pipelinePayload)
    return { success: true, payload: pipelinePayload }
  }

  if (!canProceedWithCommits(pipelinePayload)) {
    logger.warn('Skipping commits due to missing database connection or pipeline errors')
    await sendFinalReports(pipelinePayload)
    return { success: true, payload: pipelinePayload }
  }

  try {
    auditLogger.info(
      {
        context: {
          events_to_judge: (pipelinePayload.synthesizedEvents || []).map((e) => ({
            headline: e.synthesized_headline,
            key: e.event_key,
          })),
          opportunities_to_judge: (pipelinePayload.opportunitiesToSave || []).map(
            (o) => ({
              name: o.reachOutTo,
              event_key: o.event_key,
            })
          ),
        },
      },
      'Data entering Stage 5 for judging and commit'
    )

    const { allJudgedEvents, finalOpportunities } =
      await executeJudgeAndFilter(pipelinePayload)
    const approvedEvents = filterApprovedEvents(
      allJudgedEvents,
      FATAL_JUDGEMENT_QUALITIES
    )

    const { savedEvents, savedOpportunities } = await processAndSave(
      pipelinePayload,
      allJudgedEvents,
      approvedEvents,
      finalOpportunities
    )

    updatePayloadWithResults(pipelinePayload, savedEvents, savedOpportunities)
    await executeNotifications(pipelinePayload, savedEvents, savedOpportunities)
  } catch (error) {
    logger.error({ err: error }, 'Failed during commit and notify stage')
    throw error
  }

  await sendFinalReports(pipelinePayload)
  return { success: true, payload: pipelinePayload }
}
