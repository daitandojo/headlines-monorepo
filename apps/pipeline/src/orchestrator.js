// apps/pipeline/src/orchestrator.js (version 14.2.0)
import { logger } from '@headlines/utils/src/logger.js'
import { tokenTracker, apiCallTracker } from '@headlines/utils/src/server.js'
import { logFinalReport } from './utils/pipelineLogger.js'
import { runPreFlightChecks } from './pipeline/1_preflight.js'
import { runScrapeAndFilter } from './pipeline/2_scrapeAndFilter.js'
import { runAssessAndEnrich } from './pipeline/3_assessAndEnrich.js'
import { runClusterAndSynthesize } from './pipeline/4_clusterAndSynthesize.js'
import { runCommitAndNotify } from './pipeline/5_commitAndNotify.js'
import { suggestNewWatchlistEntities } from './pipeline/6_suggestNewWatchlistEntities.js'
import { runSelfHealAndOptimize } from './pipeline/7_selfHealAndOptimize.js'
import { updateSourceAnalytics } from './pipeline/submodules/commit/4_updateSourceAnalytics.js'
import { settings } from '@headlines/config/src/server.js'
import { RunVerdict } from '@headlines/models/src/index.js'

async function saveRunVerdict(payload, duration) {
  if (payload.dbConnection && !payload.noCommitMode && !payload.useTestPayload) {
    try {
      const runVerdict = new RunVerdict({
        runStats: payload.runStats,
        judgeVerdict: payload.runStats.judgeVerdict || {},
        generatedEvents: (payload.savedEvents || []).map((e) => e._id),
        generatedOpportunities: (payload.savedOpportunities || []).map((o) => o._id),
        duration_seconds: duration,
        cost_summary: {
          tokens: payload.runStats.tokenUsage,
          apis: payload.runStats.apiCalls,
        },
      })
      await runVerdict.save()
    } catch (error) {
      logger.error({ err: error }, 'Failed to save the run verdict.')
      payload.runStats.errors.push('VERDICT_SAVE_FAILED: ' + error.message)
    }
  }
}

export async function runPipeline(options) {
  const runStartTime = Date.now()
  let success = true

  apiCallTracker.reset()

  let currentPayload = {
    ...options,
    runStats: {
      headlinesScraped: 0,
      scraperHealth: [],
      validatedHeadlines: 0,
      freshHeadlinesFound: 0,
      headlinesAssessed: 0,
      relevantHeadlines: 0,
      articlesEnriched: 0,
      relevantArticles: 0,
      eventsClustered: 0,
      eventsSynthesized: 0,
      synthesizedEventsForReport: [],
      enrichmentOutcomes: [],
      judgeVerdict: null,
      eventsEmailed: 0,
      errors: [],
      tokenUsage: {},
      apiCalls: {},
    },
    dbConnection: false,
  }

  try {
    const preflight = await runPreFlightChecks(currentPayload)
    if (!preflight.success) {
      success = false
      currentPayload.runStats.errors.push('Preflight checks failed.')
      return { success, payload: currentPayload }
    }
    currentPayload = preflight.payload

    tokenTracker.initializeModels([
      settings.LLM_MODEL_HEADLINE_ASSESSMENT,
      settings.LLM_MODEL_ARTICLE_ASSESSMENT,
      settings.LLM_MODEL_SYNTHESIS,
      settings.LLM_MODEL_UTILITY,
    ])

    if (options.useTestPayload) {
      logger.warn('--- USING TEST PAYLOAD ---')
      const { testArticles } = await import('../scripts/test-pipeline/test-payload.js')
      currentPayload.articlesForPipeline = testArticles
      currentPayload.runStats.freshHeadlinesFound = testArticles.length
    } else {
      const scrape = await runScrapeAndFilter(currentPayload)
      currentPayload = scrape.payload
    }

    // DEFINITIVE FIX: This logic block ensures AI stages run if there are articles.
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

    currentPayload.runStats.tokenUsage = tokenTracker.getStats()
    currentPayload.runStats.apiCalls = apiCallTracker.getStats()

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
        await sendSupervisorReportEmail(currentPayload.runStats)
      }
    }
  } catch (error) {
    success = false
    logger.fatal(
      { err: error },
      'A critical, unhandled error occurred in the orchestrator.'
    )
    currentPayload.runStats.errors.push(`ORCHESTRATOR_FATAL: ${error.message}`)
  } finally {
    const runEndTime = Date.now()
    const durationInSeconds = (runEndTime - runStartTime) / 1000
    currentPayload.runStats.tokenUsage = tokenTracker.getStats()
    currentPayload.runStats.apiCalls = apiCallTracker.getStats()

    await saveRunVerdict(currentPayload, durationInSeconds)
    await logFinalReport(currentPayload.runStats, durationInSeconds)
  }
  return { success }
}
