// packages/data-access/src/actions/scrape.js (version 2.0.0)
'use server'

import { Source } from '../../../models/src/index.js'
import {
  testHeadlineExtraction,
  scrapeArticleContentForTest,
} from '../../../scraper-logic/src/scraper/index.js'

// This is a pure server-side function. It is NOT a Server Action and is not
// directly callable from the client. It is called by an API route.
export async function testSourceConfig(sourceConfig) {
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
          'analytics.lastRunRelevantCount': 0,
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
    return {
      success: false,
      error: 'Failed to perform test scrape.',
      details: error.message,
    }
  }
}
