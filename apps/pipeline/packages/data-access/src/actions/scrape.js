// packages/data-access/src/actions/scrape.js (version 1.1.0)
'use server'

// REMOVED: import { NextResponse } from 'next/server'
import { Source } from '@headlines/models'
import {
  testHeadlineExtraction,
  scrapeArticleContentForTest,
} from '@headlines/scraper-logic/src/scraper/index.js'
import { verifyAdmin } from '@headlines/auth'

export async function testSourceConfig(sourceConfig) {
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) return { success: false, error: authError }

  try {
    const headlines = await testHeadlineExtraction(sourceConfig)
    const success = headlines.length > 0
    let firstArticleContent = ''

    if (success) {
      firstArticleContent = await scrapeArticleContentForTest(
        headlines[0].link,
        sourceConfig.articleSelector
      )
    }

    const updatedSource = await Source.findByIdAndUpdate(
      sourceConfig._id,
      {
        $set: {
          lastScrapedAt: new Date(),
          lastSuccessAt: success ? new Date() : undefined,
          'analytics.lastRunHeadlineCount': headlines.length,
          'analytics.lastRunRelevantCount': 0, // Reset on manual test
        },
        $inc: {
          'analytics.totalRuns': 1,
          'analytics.totalSuccesses': success ? 1 : 0,
          'analytics.totalFailures': success ? 0 : 1,
        },
      },
      { new: true }
    ).lean()

    return {
      success: true,
      data: {
        count: headlines.length,
        headlines: headlines.slice(0, 5),
        firstArticleContent,
        updatedSource: JSON.parse(JSON.stringify(updatedSource)),
      },
    }
  } catch (error) {
    console.error(`[Action Test Config Error for ${sourceConfig?._id}]`, error)
    // In a server action context, we should return a plain object for the client to handle.
    return { success: false, error: 'Failed to perform test scrape.', details: error.message }
  }
}
