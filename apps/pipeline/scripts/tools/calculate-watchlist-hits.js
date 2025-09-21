// apps/pipeline/scripts/tools/calculate-watchlist-hits.js (version 1.0.0)
'use strict'
import mongoose from 'mongoose'
import cliProgress from 'cli-progress'
import colors from 'ansi-colors'
import { Article, WatchlistEntity } from '../../../../packages/models/src/index.js'
import dbConnect from '../../../../packages/data-access/src/dbConnect.js'
import { reinitializeLogger, logger } from '../../../../packages/utils-server'
import path from 'path'

// --- SCRIPT CONFIGURATION ---
const LOG_LEVEL = 'info' // Set to 'trace' for more detailed logs

// Initialize a dedicated logger for this script
reinitializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'))
logger.level = LOG_LEVEL

async function calculateHits() {
  const startTime = Date.now()
  logger.info('🚀 Starting Watchlist Hit Count Calculation...')

  await dbConnect()

  // 1. Load all data into memory
  logger.info('Loading all articles and watchlist entities into memory...')
  const [allArticles, watchlistEntities] = await Promise.all([
    Article.find({}).select('headline').lean(),
    WatchlistEntity.find({}).select('name searchTerms').lean(),
  ])
  logger.info(
    `Loaded ${watchlistEntities.length} watchlist entities and ${allArticles.length.toLocaleString()} articles.`
  )

  if (watchlistEntities.length === 0 || allArticles.length === 0) {
    logger.warn('Nothing to process. Exiting.')
    return
  }

  // 2. Perform the hit calculation
  logger.info('Calculating hits... (This may take a while)')
  const progressBar = new cliProgress.SingleBar({
    format: `Processing | ${colors.cyan('{bar}')} | {percentage}% || {value}/{total} Entities`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  })
  progressBar.start(watchlistEntities.length, 0)

  const hitCounts = new Map()

  for (const entity of watchlistEntities) {
    let count = 0
    const allTerms = [entity.name, ...(entity.searchTerms || [])]
      .map((t) => t.toLowerCase().trim())
      .filter(Boolean)

    const uniqueTerms = [...new Set(allTerms)]
    const termRegexes = uniqueTerms.map(
      (term) => new RegExp(`\\b${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')
    )

    const countedHeadlines = new Set()

    for (const article of allArticles) {
      if (countedHeadlines.has(article._id.toString())) continue

      for (const regex of termRegexes) {
        if (regex.test(article.headline)) {
          count++
          countedHeadlines.add(article._id.toString())
          break // Move to the next article once a hit is found for this entity
        }
      }
    }
    hitCounts.set(entity._id.toString(), count)
    progressBar.increment()
  }
  progressBar.stop()
  logger.info('✅ Hit calculation complete.')

  // 3. Update the database in bulk
  logger.info('Preparing bulk update for the database...')
  const bulkOps = []
  for (const [entityId, count] of hitCounts.entries()) {
    bulkOps.push({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(entityId) },
        update: { $set: { hitCount: count } },
      },
    })
  }

  if (bulkOps.length > 0) {
    logger.info(`Sending ${bulkOps.length} updates to the database...`)
    const result = await WatchlistEntity.bulkWrite(bulkOps)
    logger.info(
      `✅ Database update complete. Modified ${result.modifiedCount} documents.`
    )
  } else {
    logger.info('No updates were necessary.')
  }

  const duration = (Date.now() - startTime) / 1000
  logger.info(`✨ Operation finished in ${duration.toFixed(2)} seconds.`)
}

calculateHits()
  .catch((err) => logger.fatal({ err }, 'A critical error occurred.'))
  .finally(() => {
    if (mongoose.connection.readyState === 1) {
      mongoose.disconnect()
    }
  })
