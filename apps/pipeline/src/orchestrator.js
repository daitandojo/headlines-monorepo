// apps/pipeline/src/orchestrator.js (MODIFIED)
import { logger } from '@headlines/utils-shared'
import { tokenTracker, apiCallTracker } from '@headlines/utils-server'
import { logFinalReport } from './utils/pipelineLogger.js'
import { RunStatsManager } from './utils/runStatsManager.js'
import { ArticleTraceLogger } from './utils/articleTraceLogger.js'
import { runPreFlightChecks } from './pipeline/1_preflight.js'
import { runScrapeAndFilter } from './pipeline/2_scrapeAndFilter.js'
import { runAssessAndEnrich } from './pipeline/3_assessAndEnrich.js'
import { runClusterAndSynthesize } from './pipeline/4_clusterAndSynthesize.js'
import { runCommitAndNotify } from './pipeline/5_commitAndNotify.js'
import { suggestNewWatchlistEntities } from './pipeline/6_suggestNewWatchlistEntities.js'
import { updateSourceAnalytics } from './pipeline/submodules/commit/4_updateSourceAnalytics.js'
import { settings } from '@headlines/config'
import { RunVerdict } from '@headlines/models'
import { browserManager } from '@headlines/scraper-logic/browserManager.js'
import { sendErrorAlert } from '@headlines/utils-server'

async function saveRunVerdict(payload, duration) {
  if (payload.dbConnection && !payload.noCommitMode && !payload.useTestPayload) {
    try {
      const runStats = payload.runStatsManager.getStats()
      const runVerdict = new RunVerdict({
        runStats: runStats,
        judgeVerdict: runStats.judgeVerdict || {},
        generatedEvents: (payload.savedEvents || []).map((e) => e._id),
        generatedOpportunities: (payload.savedOpportunities || []).map((o) => o._id),
        duration_seconds: duration,
        cost_summary: {
          tokens: runStats.tokenUsage,
          apis: runStats.apiCalls,
        },
      })
      await runVerdict.save()
    } catch (error) {
      logger.error({ err: error }, 'Failed to save the run verdict.')
      payload.runStatsManager.push('errors', 'VERDICT_SAVE_FAILED: ' + error.message)
    }
  }
}

export async function runPipeline(options) {
  const runStartTime = Date.now()
  let success = true

  apiCallTracker.reset()
  const runStatsManager = new RunStatsManager()
  const articleTraceLogger = new ArticleTraceLogger()
  await articleTraceLogger.initialize()

  let currentPayload = {
    ...options,
    runStatsManager,
    articleTraceLogger,
    dbConnection: false,
  }

  try {
    logger.info('--- STAGE 1: PRE-FLIGHT CHECKS ---')
    const preflight = await runPreFlightChecks(currentPayload)
    if (!preflight.success) {
      success = false
      runStatsManager.push('errors', 'Preflight checks failed.')
      return { success, payload: currentPayload }
    }
    currentPayload = preflight.payload

    tokenTracker.initializeModels([
      settings.LLM_MODEL_HEADLINE_ASSESSMENT,
      settings.LLM_MODEL_ARTICLE_ASSESSMENT,
      settings.LLM_MODEL_SYNTHESIS,
      settings.LLM_MODEL_UTILITY,
    ])

    await browserManager.initialize()

    if (options.useTestPayload) {
      logger.warn('--- USING TEST PAYLOAD ---')
      const { testArticles } = await import('../scripts/test-pipeline/test-payload.js')
      currentPayload.articlesForPipeline = testArticles
      runStatsManager.set('freshHeadlinesFound', testArticles.length)
    } else {
      const scrape = await runScrapeAndFilter(currentPayload)
      currentPayload = scrape.payload
    }

    if (
      currentPayload.articlesForPipeline &&
      currentPayload.articlesForPipeline.length > 0
    ) {
      const assess = await runAssessAndEnrich(currentPayload)
      currentPayload = assess.payload
      if (currentPayload.enrichedArticles && currentPayload.enrichedArticles.length > 0) {
        const synthesize = await runClusterAndSynthesize(currentPayload)
        currentPayload = synthesize.payload
      }
    } else {
      logger.info('No fresh articles to process. Skipping AI analysis stages.')
    }

    runStatsManager.set('tokenUsage', tokenTracker.getStats())
    runStatsManager.set('apiCalls', apiCallTracker.getStats())

    if (!options.useTestPayload) {
      await updateSourceAnalytics(currentPayload)

      if (
        currentPayload.synthesizedEvents &&
        currentPayload.synthesizedEvents.length > 0
      ) {
        const commit = await runCommitAndNotify(currentPayload)
        currentPayload = commit.payload
        await suggestNewWatchlistEntities(currentPayload)
      } else {
        logger.info(
          'No new events were synthesized. Skipping commit and notification stages, but sending a supervisor report.'
        )
        const { sendSupervisorReportEmail } = await import('./modules/email/index.js')
        await sendSupervisorReportEmail(
          runStatsManager.getStats(),
          articleTraceLogger.getAllTraces()
        )
      }
    }
  } catch (error) {
    success = false
    runStatsManager.push('errors', `ORCHESTRATOR_FATAL: ${error.message}`)
    sendErrorAlert(error, {
      origin: 'PIPELINE_ORCHESTRATOR',
      runOptions: options,
      currentStats: runStatsManager.getStats(),
    })
  } finally {
    await browserManager.close()
    const runEndTime = Date.now()
    const durationInSeconds = (runEndTime - runStartTime) / 1000
    runStatsManager.set('tokenUsage', tokenTracker.getStats())
    runStatsManager.set('apiCalls', apiCallTracker.getStats())

    await saveRunVerdict(currentPayload, durationInSeconds)
    await logFinalReport(runStatsManager.getStats(), durationInSeconds)
    await articleTraceLogger.writeAllTraces()
  }
  return { success }
}
