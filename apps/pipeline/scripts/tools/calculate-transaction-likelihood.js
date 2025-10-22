// apps/pipeline/scripts/tools/calculate-transaction-likelihood.js
/**
 * @command tools:predict-transactions
 * @group Tools
 * @description Analyzes event history to calculate a "Likelihood to Transact" score for watchlist entities.
 */
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { WatchlistEntity, SynthesizedEvent } from '@headlines/models'
import { logger } from '@headlines/utils-shared'
import colors from 'ansi-colors'
import pLimit from 'p-limit'

const CONCURRENCY = 10

async function calculateScores() {
  await initializeScriptEnv()
  logger.info('🚀 Starting Predictive Analytics: Likelihood to Transact Calculation...')

  const entities = await WatchlistEntity.find({ status: 'active' }).lean()
  if (entities.length === 0) {
    logger.info('No active watchlist entities to analyze. Exiting.')
    return
  }

  logger.info(`Analyzing ${entities.length} active watchlist entities...`)

  const limit = pLimit(CONCURRENCY)
  const updatePromises = entities.map((entity) =>
    limit(async () => {
      const events = await SynthesizedEvent.find({ watchlistHits: entity._id })
        .sort({ createdAt: -1 })
        .lean()

      let score = 10 // Base score
      let reason = ['Base score']

      if (events.length === 0) {
        // No recent activity, score remains low
      } else {
        const now = new Date()
        const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6))
        const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1))
        const twoYearsAgo = new Date(now.setFullYear(now.getFullYear() - 2))

        for (const event of events) {
          const eventDate = new Date(event.createdAt)
          const eventType =
            event.eventClassification || event.transactionDetails?.transactionType

          if (eventType === 'Leadership Succession' && eventDate > sixMonthsAgo) {
            score += 25
            reason.push('+25 (Recent Succession)')
          }
          if (eventType === 'Funding Round' && eventDate > oneYearAgo) {
            score += 15
            reason.push('+15 (Recent Funding)')
          }
          if ((eventType === 'M&A' || eventType === 'IPO') && eventDate > twoYearsAgo) {
            score -= 30
            reason.push('-30 (Recent Transaction)')
          }
        }
      }

      // Cap the score between 0 and 100
      const finalScore = Math.max(0, Math.min(100, score))

      if (entity.likelihoodToTransact !== finalScore) {
        await WatchlistEntity.updateOne(
          { _id: entity._id },
          { $set: { likelihoodToTransact: finalScore } }
        )
        logger.info(
          `Updated "${entity.name}": ${colors.yellow(entity.likelihoodToTransact)} -> ${colors.green(finalScore)}. Reason: ${reason.join(', ')}`
        )
        return 1
      }
      return 0
    })
  )

  const results = await Promise.all(updatePromises)
  const updatedCount = results.reduce((sum, count) => sum + count, 0)

  logger.info(`✅ Calculation complete. Updated scores for ${updatedCount} entities.`)
}

calculateScores().catch((err) => {
  logger.fatal(
    { err },
    'A critical error occurred during the likelihood calculation script.'
  )
})
