// apps/pipeline/scripts/tools/calculate-watchlist-hits.js
import cliProgress from 'cli-progress'
import colors from 'ansi-colors'
import {
  findArticles,
  findWatchlistEntities,
  updateWatchlistEntities,
} from '@headlines/data-access'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'

async function calculateHits() {
  const startTime = Date.now()
  await initializeScriptEnv()
  logger.info('🚀 Starting Watchlist Hit Count Calculation...')

  const [articlesResult, entitiesResult] = await Promise.all([
    findArticles({ select: 'headline' }),
    findWatchlistEntities(),
  ])

  if (!articlesResult.success) throw new Error(articlesResult.error)
  if (!entitiesResult.success) throw new Error(entitiesResult.error)

  const allArticles = articlesResult.data
  const watchlistEntities = entitiesResult.data
  logger.info(
    `Loaded ${watchlistEntities.length} watchlist entities and ${allArticles.length.toLocaleString()} articles.`
  )

  if (watchlistEntities.length === 0 || allArticles.length === 0) {
    logger.warn('Nothing to process. Exiting.')
    return
  }

  logger.info('Calculating hits... (This may take a while)')
  const progressBar = new cliProgress.SingleBar({
    format: `Processing | ${colors.cyan('{bar}')} | {percentage}% || {value}/{total} Entities`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  })
  progressBar.start(watchlistEntities.length, 0)

  let modifiedCount = 0
  for (const entity of watchlistEntities) {
    let count = 0
    const allTerms = [entity.name, ...(entity.searchTerms || [])]
      .map((t) => t.toLowerCase().trim())
      .filter(Boolean)
    const uniqueTerms = [...new Set(allTerms)]
    const termRegexes = uniqueTerms.map(
      (term) => new RegExp(`\\b${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')
    )

    if (termRegexes.length > 0) {
      count = allArticles.filter((article) =>
        termRegexes.some((regex) => regex.test(article.headline))
      ).length
    }

    if (entity.hitCount !== count) {
      const updateResult = await updateWatchlistEntities(
        { _id: entity._id },
        { $set: { hitCount: count } }
      )
      if (updateResult.success) modifiedCount += updateResult.modifiedCount
    }
    progressBar.increment()
  }
  progressBar.stop()
  logger.info('✅ Hit calculation complete.')

  logger.info(`✅ Database update complete. Modified ${modifiedCount} documents.`)
  const duration = (Date.now() - startTime) / 1000
  logger.info(`✨ Operation finished in ${duration.toFixed(2)} seconds.`)
}

calculateHits().catch((err) => logger.fatal({ err }, 'A critical error occurred.'))
