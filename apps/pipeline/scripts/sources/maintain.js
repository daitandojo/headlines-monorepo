// apps/pipeline/scripts/sources/maintain.js
/**
 * @command sources:maintain
 * @group Sources
 * @description Run the autonomous agent to find, fix, and prune sources.
 */
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger, sendErrorAlert } from '@headlines/utils-server'
import { getAllSources, updateSource } from '@headlines/data-access'
import colors from 'ansi-colors'

const LOW_LEAD_RATE_THRESHOLD = 0.01 // 1%
const MIN_RUNS_FOR_PRUNING = 100

async function maintainSources() {
  try {
    await initializeScriptEnv()
    logger.info('🤖 Starting Autonomous Scraper Maintenance...')

    logger.info('--- Phase 1: Identifying and Reporting Failing Scrapers ---')
    const failingResult = await getAllSources({
      filter: {
        status: 'active',
        'analytics.totalRuns': { $gt: 0 },
        'analytics.lastRunHeadlineCount': 0,
      },
    })
    if (!failingResult.success) throw new Error(failingResult.error)
    const failingSources = failingResult.data

    if (failingSources.length === 0) {
      logger.info('✅ No failing sources detected.')
    } else {
      logger.warn(
        `Found ${failingSources.length} failing sources. Self-healing is disabled, reporting only:`
      )
      for (const source of failingSources) {
        logger.warn(
          colors.red(
            `  - FAILED: ${source.name} (Last scraped: ${source.lastScrapedAt?.toISOString() || 'N/A'})`
          )
        )
      }
    }

    logger.info('\n--- Phase 2: Pruning Low-Value (High Noise) Sources ---')
    const candidatesResult = await getAllSources({
      filter: {
        'analytics.totalRuns': { $gt: MIN_RUNS_FOR_PRUNING },
        scrapeFrequency: 'high',
      },
    })
    if (!candidatesResult.success) throw new Error(candidatesResult.error)
    const candidatesForPruning = candidatesResult.data

    let prunedCount = 0
    for (const source of candidatesForPruning) {
      const analytics = source.analytics
      const leadRate =
        analytics.totalScraped > 0 ? analytics.totalRelevant / analytics.totalScraped : 0
      if (leadRate < LOW_LEAD_RATE_THRESHOLD) {
        const updateResult = await updateSource(source._id, { scrapeFrequency: 'low' })
        if (updateResult.success) {
          logger.warn(
            `  - Downgraded "${source.name}" to 'low' frequency due to low lead rate (${(leadRate * 100).toFixed(2)}%).`
          )
          prunedCount++
        }
      }
    }

    if (prunedCount > 0) {
      logger.info(`✅ Pruning complete. Downgraded ${prunedCount} noisy sources.`)
    } else {
      logger.info('✅ No sources met the criteria for pruning.')
    }

    logger.info('\n🤖 Autonomous Scraper Maintenance complete.')
  } catch (error) {
    sendErrorAlert(error, { origin: 'MAINTAIN_SOURCES_SCRIPT' })
    logger.fatal({ err: error }, 'A critical error occurred during source maintenance.')
  }
}

maintainSources()
