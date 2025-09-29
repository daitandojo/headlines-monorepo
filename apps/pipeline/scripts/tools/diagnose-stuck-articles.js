// apps/pipeline/scripts/tools/diagnose-stuck-articles.js
'use server'

import mongoose from 'mongoose'
import { Article } from '@headlines/models'
import dbConnect from '@headlines/data-access/dbConnect/node'
import { logger } from '@headlines/utils-server'
import colors from 'ansi-colors'

async function diagnose() {
  await dbConnect()
  logger.info('🔬 Running diagnostic script for stuck articles...')

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const stuckArticles = await Article.find({
      synthesizedEventId: { $exists: false },
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .sort({ createdAt: -1 })
      .limit(10) // Let's just look at the first 10 to see the pattern
      .lean()

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

    // Use console.log for clean table output that the logger might interfere with.
    console.log('\n--- Sample of Stuck Articles ---')
    console.table(
      stuckArticles.map((a) => ({
        _id: a._id.toString(),
        createdAt: a.createdAt.toISOString(),
        headline: a.headline.substring(0, 50) + '...',
        newspaper: a.newspaper,
        status: a.status, // THIS IS THE KEY FIELD TO CHECK
        relevance_headline: a.relevance_headline,
        relevance_article: a.relevance_article,
      }))
    )
  } catch (error) {
    logger.error(
      { err: error },
      'A critical error occurred during the diagnostic script.'
    )
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  }
}

diagnose()
