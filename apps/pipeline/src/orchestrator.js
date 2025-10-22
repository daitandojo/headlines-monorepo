// apps/pipeline/src/orchestrator.js
import { logger } from '@headlines/utils-shared'
import { tokenTracker, apiCallTracker } from '@headlines/utils-server'
import { logFinalReport } from './utils/pipelineLogger.js'
import { RunStatsManager } from './utils/runStatsManager.js'
import { ArticleTraceLogger } from './utils/articleTraceLogger.js'
import { runPreFlightChecks } from './pipeline/1_preflight.js'
import { runScrapeAndFilter } from './pipeline/2_scrapeAndFilter.js'
import { runAssessAndEnrich } from './pipeline/3_assessAndEnrich.js'
import { runEntityResolution } from './pipeline/3_5_entityResolution.js'
import { runClusterAndSynthesize } from './pipeline/4_clusterAndSynthesize.js'
import { runOpportunityDeepDive } from './pipeline/4_5_opportunityDeepDive.js'
import { runCommitAndNotify } from './pipeline/5_commitAndNotify.js'
import { runUpdateKnowledgeGraph } from './pipeline/5_5_updateKnowledgeGraph.js'
import { suggestNewWatchlistEntities } from './pipeline/6_suggestNewWatchlistEntities.js'
import { updateSourceAnalytics } from './pipeline/submodules/commit/4_updateSourceAnalytics.js'
import { settings } from '@headlines/config'
import { RunVerdict, Article, SynthesizedEvent } from '@headlines/models'
import { browserManager } from '@headlines/scraper-logic/browserManager.js'
import { sendErrorAlert } from '@headlines/utils-server'
import mongoose from 'mongoose'

const PIPELINE_STAGES = {
  PREFLIGHT: { name: 'preflight', required: true },
  SCRAPE: { name: 'scrape', required: true },
  ASSESS: { name: 'assess', required: true },
  RESOLVE: { name: 'entityResolution', required: true },
  SYNTHESIZE: { name: 'synthesize', required: true },
  DEEP_DIVE: { name: 'opportunityDeepDive', required: true },
  COMMIT: { name: 'commit', required: true },
  KNOWLEDGE_GRAPH: { name: 'knowledgeGraph', required: true },
  WATCHLIST: { name: 'watchlist', required: true },
}

function initializePipelineContext(options) {
  apiCallTracker.reset()
  tokenTracker.reset()
  const runStatsManager = new RunStatsManager()
  const articleTraceLogger = new ArticleTraceLogger()
  return {
    ...options,
    isRefreshMode: options.refresh === true,
    runStatsManager,
    articleTraceLogger,
    dbConnection: false,
    startTime: Date.now(),
  }
}

async function initializeResources() {
  tokenTracker.initializeModels([
    settings.LLM_MODEL_HEADLINE_ASSESSMENT,
    settings.LLM_MODEL_ARTICLE_ASSESSMENT,
    settings.LLM_MODEL_SYNTHESIS,
    settings.LLM_MODEL_UTILITY,
    settings.LLM_MODEL_PRO,
  ])
  await browserManager.initialize()
}

async function sendSupervisorReport(runStatsManager, articleTraceLogger) {
  try {
    const { sendSupervisorReportEmail } = await import('./modules/email/index.js')
    await sendSupervisorReportEmail(
      runStatsManager.getStats(),
      articleTraceLogger.getAllTraces()
    )
  } catch (error) {
    logger.error({ err: error }, 'Failed to send supervisor report')
  }
}

function updateTrackingStats(payload) {
  payload.runStatsManager.set('tokenUsage', tokenTracker.getStats())
  payload.runStatsManager.set('apiCalls', apiCallTracker.getStats())
}

async function saveRunVerdict(payload, duration) {
  if (!payload.dbConnection || payload.noCommitMode) {
    return
  }
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
    logger.info({ verdictId: runVerdict._id }, 'Run verdict saved successfully')
  } catch (error) {
    logger.error({ err: error }, 'Failed to save run verdict')
    payload.runStatsManager.push('errors', `VERDICT_SAVE_FAILED: ${error.message}`)
  }
}

function handlePipelineError(error, context) {
  context.runStatsManager.push('errors', `ORCHESTRATOR_FATAL: ${error.message}`)
  logger.error(
    {
      err: error,
      stage: context.currentStage,
      stats: context.runStatsManager.getStats(),
    },
    'Pipeline execution failed'
  )
  sendErrorAlert(error, {
    origin: 'PIPELINE_ORCHESTRATOR',
    stage: context.currentStage,
    runOptions: {
      refresh: context.isRefreshMode,
      noCommitMode: context.noCommitMode,
      useTestPayload: context.useTestPayload,
    },
    currentStats: context.runStatsManager.getStats(),
  })
}

async function cleanup(context) {
  await browserManager.close()
  const duration = (Date.now() - context.startTime) / 1000
  updateTrackingStats(context)
  await saveRunVerdict(context, duration)
  await logFinalReport(context.runStatsManager.getStats(), duration)
  await context.articleTraceLogger.writeAllTraces()
  logger.info({ duration }, 'Pipeline execution completed')
}

function createSyntheticTestArticle() {
  return {
    _id: new mongoose.Types.ObjectId(),
    headline: 'Danish shipping family sells NaviSoft SaaS package for $500mm',
    link: `https://test.headlines.dev/article/${new mongoose.Types.ObjectId()}`,
    source: 'Test E2E Source',
    newspaper: 'Test E2E Source',
    country: ['Denmark'],
    status: 'scraped',
    relevance_headline: 100,
    assessment_headline: 'Synthetic article for pipeline end-to-end test.',
    articleContent: {
      contents: [
        'COPENHAGEN -- The reclusive Møller-Jensen shipping dynasty has sold their privately-held maritime logistics software company, NaviSoft, for an estimated $500 million. The buyer is a US-based private equity firm, Global Tech Partners. NaviSoft, a critical player in container fleet management SaaS, was founded by patriarch Lars Møller-Jensen. His daughter, CEO Eva Møller-Jensen, confirmed the sale. "This transaction allows our family to focus on our new green energy fund," she stated. The family intends to deploy the capital through their family office, M-J Invest.',
      ],
    },
  }
}

export async function runPipeline(options) {
  let context = initializePipelineContext(options)
  let success = true

  try {
    await context.articleTraceLogger.initialize()
    logger.info('--- ARCHITECTURE: Running in Staged, Resumable Mode ---')

    context.currentStage = PIPELINE_STAGES.PREFLIGHT.name
    context = (await runPreFlightChecks(context)).payload
    await initializeResources()

    // --- START OF DEFINITIVE FIX ---
    // This logic now correctly handles three distinct modes:
    // 1. Injected Payload Mode (e.g., from a recovery script)
    // 2. Test Mode (using the --test flag)
    // 3. Standard Mode (scraping live data)
    if (context.articlesForPipeline && context.articlesForPipeline.length > 0) {
      logger.warn('--- INJECTED PAYLOAD MODE ACTIVATED ---')
      logger.warn(
        `Bypassing scrape. Processing ${context.articlesForPipeline.length} articles provided directly to the orchestrator.`
      )
      context.runStatsManager.set(
        'freshHeadlinesFound',
        context.articlesForPipeline.length
      )
    } else if (context.test) {
      logger.warn('--- TEST MODE ACTIVATED ---')
      logger.warn('Performing pre-run cleanup for test data...')
      await Promise.all([
        Article.deleteMany({ source: 'Test E2E Source' }),
        SynthesizedEvent.deleteMany({ event_key: /sale-moller-jensen-navisoft/ }),
      ])
      logger.warn('Bypassing scrape. Injecting one high-quality synthetic article.')
      const testArticle = createSyntheticTestArticle()
      context.articlesForPipeline = [testArticle]
      context.runStatsManager.set('freshHeadlinesFound', 1)
      context.lean = true
      context.skipdeepdive = true
    } else {
      context.currentStage = PIPELINE_STAGES.SCRAPE.name
      context = (await runScrapeAndFilter(context)).payload
    }
    // --- END OF DEFINITIVE FIX ---

    context.currentStage = PIPELINE_STAGES.ASSESS.name
    context = (await runAssessAndEnrich(context)).payload

    context.currentStage = PIPELINE_STAGES.RESOLVE.name
    context = (await runEntityResolution(context)).payload

    context.currentStage = PIPELINE_STAGES.SYNTHESIZE.name
    context = (await runClusterAndSynthesize(context)).payload

    context.currentStage = PIPELINE_STAGES.DEEP_DIVE.name
    if (context.skipdeepdive) {
      logger.warn(
        '--- SKIPPING STAGE 4.5: OPPORTUNITY DEEP DIVE (as requested by flag) ---'
      )
    } else {
      context = (await runOpportunityDeepDive(context)).payload
    }

    updateTrackingStats(context)
    await updateSourceAnalytics(context)

    context.currentStage = PIPELINE_STAGES.COMMIT.name
    context = (await runCommitAndNotify(context)).payload

    context.currentStage = PIPELINE_STAGES.KNOWLEDGE_GRAPH.name
    context = (await runUpdateKnowledgeGraph(context)).payload

    context.currentStage = PIPELINE_STAGES.WATCHLIST.name
    await suggestNewWatchlistEntities(context)
  } catch (error) {
    success = false
    handlePipelineError(error, context)
  } finally {
    await cleanup(context)
  }

  return { success, stats: context.runStatsManager.getStats() }
}
