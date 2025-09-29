// apps/pipeline/scripts/sources/maintain.js (version 2.0.0)
import dbConnect from '../../packages/data-access/src/dbConnect.js'
import { Source } from '@headlines/models'
import { logger } from '@headlines/utils-server'
import mongoose from 'mongoose'
import colors from 'ansi-colors'

const LOW_LEAD_RATE_THRESHOLD = 0.01 // 1%
const MIN_RUNS_FOR_PRUNING = 100

async function maintainSources() {
  await dbConnect()
  logger.info('🤖 Starting Autonomous Scraper Maintenance...')

  // --- 1. Report on Failing Sources (Self-Heal Disabled) ---
  logger.info('--- Phase 1: Identifying and Reporting Failing Scrapers ---')
  const failingSources = await Source.find({
    status: 'active',
    'analytics.totalRuns': { $gt: 0 },
    'analytics.lastRunHeadlineCount': 0,
  }).lean()

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

  // --- 2. Proactive Pruning of Low-Value Sources ---
  logger.info('\n--- Phase 2: Pruning Low-Value (High Noise) Sources ---')
  const candidatesForPruning = await Source.find({
    'analytics.totalRuns': { $gt: MIN_RUNS_FOR_PRUNING },
    scrapeFrequency: 'high',
  }).lean()

  let prunedCount = 0
  for (const source of candidatesForPruning) {
    const analytics = source.analytics
    const leadRate =
      analytics.totalScraped > 0 ? analytics.totalRelevant / analytics.totalScraped : 0
    if (leadRate < LOW_LEAD_RATE_THRESHOLD) {
      await Source.findByIdAndUpdate(source._id, { $set: { scrapeFrequency: 'low' } })
      logger.warn(
        `  - Downgraded "${source.name}" to 'low' frequency due to low lead rate (${(leadRate * 100).toFixed(2)}%).`
      )
      prunedCount++
    }
  }

  if (prunedCount > 0) {
    logger.info(`✅ Pruning complete. Downgraded ${prunedCount} noisy sources.`)
  } else {
    logger.info('✅ No sources met the criteria for pruning.')
  }

  logger.info('\n🤖 Autonomous Scraper Maintenance complete.')
}

maintainSources().finally(() => mongoose.disconnect())
