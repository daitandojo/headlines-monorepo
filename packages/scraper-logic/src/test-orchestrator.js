// packages/scraper-logic/src/test-orchestrator.js (NEW FILE)
'use server'

// --- START OF THE FIX ---
// Import the high-level scraper functions, not playwright directly.
import { testHeadlineExtraction, scrapeArticleContentForTest } from './scraper/index.js'
// --- END OF THE FIX ---
import { Source } from '@headlines/models'

// This is the logic moved from data-access/actions/scrape.js
export async function testScraperRecipe(sourceConfig, articleUrl = null) {
  // Mode 1: Test a single article's content
  if (articleUrl && sourceConfig.articleSelector) {
    const content = await scrapeArticleContentForTest(
      articleUrl,
      sourceConfig.articleSelector
    )
    return { success: true, content: { preview: content, sourceUrl: articleUrl } }
  }

  // Mode 2: Test the full source recipe for headlines
  if (sourceConfig && sourceConfig.sectionUrl) {
    const headlines = await testHeadlineExtraction(sourceConfig)

    // Update source analytics after the test
    const success = headlines.length > 0
    await Source.findByIdAndUpdate(
      sourceConfig._id,
      {
        $set: {
          lastScrapedAt: new Date(),
          lastSuccessAt: success ? new Date() : undefined,
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
      headlines: {
        count: headlines.length,
        samples: headlines.slice(0, 10),
      },
    }
  }

  throw new Error('Invalid request payload for testScraperRecipe.')
}
