// apps/pipeline/src/pipeline/5_commitAndNotify.js
import { logger, auditLogger } from '@headlines/utils/src/server.js'
import { sendSupervisorReportEmail } from '../modules/email/index.js'
import { judgeAndFilterOutput } from './submodules/commit/1_judgeOutput.js'
import { saveResultsToDb } from './submodules/commit/2_saveResults.js'
import { triggerNotifications } from './submodules/commit/3_triggerNotifications.js'

const FATAL_JUDGEMENT_QUALITIES = ['Irrelevant', 'Poor']

export async function runCommitAndNotify(pipelinePayload) {
  logger.info('--- STAGE 5: COMMIT & NOTIFY ---')
  const { noCommitMode, runStats, isDryRun, dbConnection } = pipelinePayload

  if (noCommitMode || isDryRun) {
    logger.warn(
      'COMMIT/NOTIFY: Skipping database commits and user notifications due to run flags.'
    )
    if (!isDryRun) await sendSupervisorReportEmail(runStats)
    return { success: true, payload: pipelinePayload }
  }

  if (dbConnection && (!runStats.errors || runStats.errors.length === 0)) {
    const { finalEvents, finalOpportunities } = await judgeAndFilterOutput(
      pipelinePayload,
      FATAL_JUDGEMENT_QUALITIES
    )

    const { savedEvents, savedOpportunities, articlesSavedCount } = await saveResultsToDb(
      pipelinePayload,
      finalEvents,
      finalOpportunities
    )

    pipelinePayload.savedEvents = savedEvents
    pipelinePayload.savedOpportunities = savedOpportunities

    logger.info(
      `Database Save Summary: ${articlesSavedCount} articles processed, ${savedEvents.length} events committed, ${savedOpportunities.length} opportunities committed.`
    )

    if (savedEvents.length > 0 || savedOpportunities.length > 0) {
      logger.info(
        `Triggering notifications for ${savedEvents.length} committed events and ${savedOpportunities.length} committed opportunities.`
      )
      await triggerNotifications(pipelinePayload, savedEvents, savedOpportunities)
    } else {
      logger.info(
        'No new items were successfully committed to the database. Skipping user notifications.'
      )
    }
  }

  auditLogger.info({ context: { run_stats: runStats } }, 'Final Run Statistics')
  await sendSupervisorReportEmail(runStats)
  return { success: true, payload: pipelinePayload }
}
