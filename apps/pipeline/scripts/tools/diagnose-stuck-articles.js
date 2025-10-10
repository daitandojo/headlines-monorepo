// apps/pipeline/scripts/tools/diagnose-stuck-articles.js
/**
 * @command tools:diagnose
 * @group Tools
 * @description Finds and displays properties of articles from the last 24 hours that may be stuck in the pipeline.
 */
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { findArticles } from '@headlines/data-access'
import colors from 'ansi-colors'

async function diagnose() {
  await initializeScriptEnv()
  logger.info('🔬 Running diagnostic script for stuck articles...')

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const articlesResult = await findArticles({
      filter: {
        synthesizedEventId: { $exists: false },
        createdAt: { $gte: twentyFourHoursAgo },
      },
      limit: 10,
    })

    if (!articlesResult.success) throw new Error(articlesResult.error)
    const stuckArticles = articlesResult.data

    if (stuckArticles.length === 0) {
      logger.info(
        '❌ DIAGNOSTIC FAILED: Could not find any articles from the last 24 hours that are missing a `synthesizedEventId`. This is unexpected.'
      )
      return
    }

    logger.info(
      colors.green(
        `✅ Found ${stuckArticles.length} potentially stuck articles. Displaying their properties:`
      )
    )

    console.log('\n--- Sample of Stuck Articles ---')
    console.table(
      stuckArticles.map((a) => ({
        _id: a._id.toString(),
        createdAt: a.createdAt.toISOString(),
        headline: a.headline.substring(0, 50) + '...',
        newspaper: a.newspaper,
        status: a.status,
        relevance_headline: a.relevance_headline,
        relevance_article: a.relevance_article,
      }))
    )
  } catch (error) {
    logger.error(
      { err: error },
      'A critical error occurred during the diagnostic script.'
    )
  }
}

diagnose()
