// apps/pipeline/src/orchestrator.js
import { logger } from '@headlines/utils-shared'
import { tokenTracker, apiCallTracker } from '@headlines/utils-server'
import { logFinalReport } from './utils/pipelineLogger.js'
import { RunStatsManager } from './utils/runStatsManager.js'
import { ArticleTraceLogger } from './utils/articleTraceLogger.js'
import { pipelineEmitter } from './utils/pipelineEmitter.js'
import { runPreFlightChecks } from './pipeline/1_preflight.js'
import { runScrapeAndFilter } from './pipeline/2_scrapeAndFilter.js'
import { runAssessAndEnrich } from './pipeline/3_assessAndEnrich.js'
import { runEntityResolution } from './pipeline/3_5_entityResolution.js'
import { runClusterAndSynthesize } from './pipeline/4_clusterAndSynthesize.js'
import { runOpportunityDeepDive } from './pipeline/4_5_opportunityDeepDive.js'
import { runIntelligenceEnrichment } from './pipeline/4_75_intelligenceEnrichment.js'
import { runCommitAndNotify } from './pipeline/5_commitAndNotify.js'
import { runSelfHealAndOptimize } from './pipeline/7_selfHealAndOptimize.js'
import { selfHealer } from './modules/monitoring/selfHeal.js'
import { selfHealerV2 } from './modules/monitoring/selfHealV2.js'
import { pipelineMetrics } from './modules/monitoring/pipelineMetrics.js'
import { attemptSelectorRepair } from './modules/monitoring/selectorHealer.js'
import { runUpdateKnowledgeGraph } from './pipeline/5_5_updateKnowledgeGraph.js'
import { suggestNewWatchlistEntities } from './pipeline/6_suggestNewWatchlistEntities.js'
import { updateSourceAnalytics } from './pipeline/submodules/commit/4_updateSourceAnalytics.js'
import { settings } from '@headlines/config'
import { getFallbackModel } from '@headlines/ai-services'
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
  INTELLIGENCE_ENRICHMENT: { name: 'intelligenceEnrichment', required: true },
  COMMIT: { name: 'commit', required: true },
  KNOWLEDGE_GRAPH: { name: 'knowledgeGraph', required: true },
  WATCHLIST: { name: 'watchlist', required: true },
}

function initializePipelineContext(options) {
  apiCallTracker.reset()
  tokenTracker.reset()
  const runStatsManager = new RunStatsManager()
  const articleTraceLogger = new ArticleTraceLogger()
  const runId = process.env.PIPELINE_RUN_ID || `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const emitter = pipelineEmitter(runId)
  return {
    ...options,
    isRefreshMode: options.refresh === true,
    runStatsManager,
    articleTraceLogger,
    emitter,
    runId,
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
  
  // Initialize pipeline metrics
  pipelineMetrics.startRun()
}

async function sendSupervisorReport(runStatsManager, articleTraceLogger) {
  try {
    const { sendSupervisorReportEmail } = await import('./modules/email/index.js')
    await sendSupervisorReportEmail(
      runStatsManager.getStats(),
      articleTraceLogger.getAllTraces()
    )
  } catch (error) {
    logger.error('Failed to send supervisor report:', error.message?.substring(0, 80) || '')
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
    const judgeVerdict = runStats.judgeVerdict || {}
    const eventVerdicts = (judgeVerdict.event_judgements || []).map((j) => {
      const match = (payload.synthesizedEvents || []).find(
        (e) => `Event: ${e.synthesized_headline}` === j.identifier
      )
      return {
        eventId: match?._id,
        headline: j.identifier,
        quality: j.quality,
        commentary: j.commentary,
      }
    })
    const opportunityVerdicts = (judgeVerdict.opportunity_judgements || []).map((j) => {
      const match = (payload.opportunitiesToSave || []).find(
        (o) => `Opportunity: ${o.reachOutTo}` === j.identifier
      )
      return {
        opportunityId: match?._id,
        name: j.identifier,
        quality: j.quality,
        commentary: j.commentary,
      }
    })
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
      eventVerdicts,
      opportunityVerdicts,
    })
    await runVerdict.save()
    logger.info({ verdictId: runVerdict._id }, 'Run verdict saved successfully')
  } catch (error) {
    logger.error('Failed to save run verdict:', error.message?.substring(0, 80) || '')
    payload.runStatsManager.push('errors', `VERDICT_SAVE_FAILED: ${error.message}`)
  }
}

function handlePipelineError(error, context) {
  const errSummary = error.message?.substring(0, 100) || "Unknown error";
  context.runStatsManager.push('errors', `ORCHESTRATOR_FATAL: ${errSummary}`)
  logger.error(`\x1b[31mPipeline failed at ${context.currentStage}:\x1b[0m ${errSummary}`)
  sendErrorAlert(error, {
    origin: 'PIPELINE_ORCHESTRATOR',
    stage: context.currentStage,
    runOptions: {
      refresh: context.isRefreshMode,
      noCommitMode: context.noCommitMode,
      useTestPayload: context.useTestPayload,
    },
    errorSummary: errSummary,
  })
}

async function cleanup(context) {
  await browserManager.close()
  const duration = (Date.now() - context.startTime) / 1000
  updateTrackingStats(context)
  await saveRunVerdict(context, duration)
  await logFinalReport(context.runStatsManager.getStats(), duration)
  await context.articleTraceLogger.writeAllTraces()
  
  // End pipeline metrics run and get final summary
  const metricsSummary = pipelineMetrics.endRun()
  logger.info({ 
    duration: `${duration}s`,
    stages: metricsSummary.stages,
    topSources: metricsSummary.sources.slice(0, 3),
    models: metricsSummary.models 
  }, '[Metrics] Pipeline run completed')
  
  if (context.emitter) {
    context.emitter.done({
      duration,
      stats: context.runStatsManager.getStats(),
    })
    await context.emitter.close()
  }
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
    context.emitter.stageStart('preflight')
    context = (await runPreFlightChecks(context)).payload
    context.emitter.stageEnd('preflight')
    context.emitter.setMeta({ runId: context.runId })
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
      context.emitter.headlineFound(context.articlesForPipeline.length)
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
      context.emitter.stageStart('scrape')
      context = (await runScrapeAndFilter(context)).payload
      context.emitter.stageEnd('scrape')
    }
    // --- END OF DEFINITIVE FIX ---

    context.currentStage = PIPELINE_STAGES.ASSESS.name
    context.emitter.stageStart('assess')
    context = (await runAssessAndEnrich(context)).payload
    context.emitter.stageEnd('assess')

    context.currentStage = PIPELINE_STAGES.RESOLVE.name
    context.emitter.stageStart('entityResolution')
    context = (await runEntityResolution(context)).payload
    context.emitter.stageEnd('entityResolution')

    context.currentStage = PIPELINE_STAGES.SYNTHESIZE.name
    context.emitter.stageStart('synthesize')
    context = (await runClusterAndSynthesize(context)).payload
    context.emitter.stageEnd('synthesize')

    context.currentStage = PIPELINE_STAGES.DEEP_DIVE.name
    if (context.skipdeepdive) {
      logger.warn(
        '--- SKIPPING STAGE 4.5: OPPORTUNITY DEEP DIVE (as requested by flag) ---'
      )
    } else {
      context.emitter.stageStart('opportunityDeepDive')
      context = (await runOpportunityDeepDive(context)).payload
      context.emitter.stageEnd('opportunityDeepDive')
    }

    updateTrackingStats(context)
    await updateSourceAnalytics(context)

    context.currentStage = PIPELINE_STAGES.COMMIT.name
    context.emitter.stageStart('commit')
    context = (await runCommitAndNotify(context)).payload
    context.emitter.stageEnd('commit')

    // Intelligence Enrichment (Tier 1: filings, FO discovery, advisors, wealth chains, sentiment)
    // Runs after commit so savedEvents and savedOpportunities are finalized
    context.currentStage = PIPELINE_STAGES.INTELLIGENCE_ENRICHMENT.name
    context.emitter.stageStart('intelligenceEnrichment')
    context = (await runIntelligenceEnrichment(context)).payload
    context.emitter.stageEnd('intelligenceEnrichment')

    context.currentStage = PIPELINE_STAGES.KNOWLEDGE_GRAPH.name
    context.emitter.stageStart('knowledgeGraph')
    context = (await runUpdateKnowledgeGraph(context)).payload
    context.emitter.stageEnd('knowledgeGraph')

    context.currentStage = PIPELINE_STAGES.WATCHLIST.name
    context.emitter.stageStart('watchlist')
    await suggestNewWatchlistEntities(context)
    context.emitter.stageEnd('watchlist')
  } catch (error) {
    success = false
    handlePipelineError(error, context)
  } finally {
    // Record metrics for each stage
    Object.keys(PIPELINE_STAGES).forEach(stageKey => {
      const stage = PIPELINE_STAGES[stageKey]
      context.runStatsManager.push(`stage_${stage.name}_attempted`, 1)
    })
    
    // Record source results if available
    if (context.scrapedArticles && Array.isArray(context.scrapedArticles)) {
      context.scrapedArticles.forEach(article => {
        if (article.newspaper) {
          pipelineMetrics.recordSourceResult(article.newspaper, 1, 0) // Duration would need tracking
        }
      })
    }
    
     // Record model usage from tokenTracker
    const tokenStats = tokenTracker.getStats()
    const fallbackModelName = settings.LLM_MODEL_SYNTHESIS || "deepseek/deepseek-v4-flash"
    const WHITELIST = [
      'deepseek-api:deepseek-chat', 'kimi-k2-turbo-preview',
      'deepseek/deepseek-v4-flash',
    ]
    const modelPricing = {
      'deepseek-api:deepseek-chat': { input: 0.27, output: 1.10 },
      'kimi-k2-turbo-preview': { input: 0, output: 0 },
      'deepseek/deepseek-v4-flash': { input: 0, output: 0 },
    }

    Object.keys(tokenStats).forEach(model => {
      const entry = tokenStats[model]
      if (!entry || (entry.inputTokens === 0 && entry.outputTokens === 0)) return

      const totalTokens = (entry.inputTokens || 0) + (entry.outputTokens || 0)
      const pricing = modelPricing[model]
      const cost = pricing
        ? ((entry.inputTokens || 0) / 1e6) * pricing.input + ((entry.outputTokens || 0) / 1e6) * pricing.output
        : 0

      const recordName = WHITELIST.includes(model) ? model : fallbackModelName
      pipelineMetrics.recordModelUsage(recordName, totalTokens, cost, true)
    })
    
    // Smart selector repair (DOM heuristics first, LLM fallback)
    const scraperHealth = context.runStatsManager?.getStats()?.scraperHealth || []
    const failedSources = scraperHealth.filter(h => !h.success && h.debugHtml)
    if (failedSources.length > 0) {
      logger.info(`\x1b[36m[SelectorHealer] Attempting repair for ${failedSources.length} failed sources\x1b[0m`)
      for (const entry of failedSources) {
        await attemptSelectorRepair(entry, context.runId)
      }
    }

    // Run self-healing analysis (V2 - auto-remediation)
    const healthReport = selfHealer.getHealthReport()
    if (healthReport.sourcesWithIssues.length > 0 || healthReport.modelsWithIssues.length > 0) {
      logger.info(`\x1b[33m[SelfHealV2] ${healthReport.sourcesWithIssues.length} sources, ${healthReport.modelsWithIssues.length} models with issues\x1b[0m`)
      
      for (const issue of healthReport.sourcesWithIssues) {
        const remediation = selfHealer.recordSourceFailure(issue.source)
        if (remediation) {
          await selfHealerV2.recordSourceFailure(issue.source, context.runId)
          logger.warn(`\x1b[33m[SelfHealV2] Source "${issue.source}" — auto-pause triggered\x1b[0m`)
        }
      }
      
      healthReport.modelsWithIssues.forEach(issue => {
        const [modelName, errorType] = issue.modelKey?.split(':') || []
        if (modelName) {
          selfHealerV2.recordModelError(modelName, errorType || 'unknown', context.runId)
        }
      })
    }
    
    // Check for sources to reactivate
    await selfHealerV2.checkAndHealSources(context.runId)
    
    await cleanup(context)
  }

  // Run final self-healing and optimization
  try {
    context = await runSelfHealAndOptimize({
      ...context,
      selfHealer,
      pipelineMetrics,
      healthReport: selfHealer.getHealthReport()
    })
    logger.info('--- STAGE 7 COMPLETE ---')
  } catch (error) {
    logger.error('Self-healing stage failed:', error.message?.substring(0, 80) || 'Unknown error')
    // Don't fail the entire pipeline for self-healing issues
  }

  return { success, stats: context?.runStatsManager?.getStats() || {} }
}
