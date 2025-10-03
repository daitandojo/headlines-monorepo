// apps/pipeline/scripts/maintenance/recalculate-analytics.js
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { findSources, updateSource } from '@headlines/data-access'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

async function recalculateAnalytics() {
  const argv = yargs(hideBin(process.argv))
    .option('yes', { type: 'boolean', description: 'Skip confirmation prompt.' })
    .help().argv

  await initializeScriptEnv()
  logger.info('🚀 Starting Source Analytics Recalculation...')

  try {
    const sourcesResult = await findSources({ select: 'analytics' })
    if (!sourcesResult.success) throw new Error(sourcesResult.error)
    const sources = sourcesResult.data

    if (sources.length === 0) {
      logger.info('No sources found. Nothing to do.')
      return
    }

    logger.warn(
      `This script will perform the following actions on ${sources.length} sources:`
    )
    logger.warn(
      `  1. Correct 'totalScraped' to equal 'totalRelevant' (ensuring no negative relevance %).`
    )
    logger.warn(`  2. Reset 'totalRuns', 'totalSuccesses', and 'totalFailures' to 0.`)
    logger.warn(
      'This will provide a clean slate for the new, more accurate analytics collection.'
    )

    if (!argv.yes) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      const answer = await new Promise((resolve) =>
        readline.question('Are you sure you want to proceed? (yes/no): ', resolve)
      )
      readline.close()
      if (answer.toLowerCase() !== 'yes') {
        logger.info('Operation cancelled by user.')
        return
      }
    }

    let modifiedCount = 0
    for (const source of sources) {
      const totalRelevant = source.analytics?.totalRelevant || 0
      const updateData = {
        'analytics.totalRuns': 0,
        'analytics.totalSuccesses': 0,
        'analytics.totalFailures': 0,
        'analytics.totalScraped': Math.max(0, totalRelevant),
      }

      const updateResult = await updateSource(source._id, updateData)
      if (updateResult.success) modifiedCount++
    }

    logger.info(
      `✅ Analytics reset complete. Modified ${modifiedCount} source documents.`
    )
  } catch (error) {
    logger.fatal({ err: error }, '❌ Failed to recalculate source analytics.')
  }
}

recalculateAnalytics()
