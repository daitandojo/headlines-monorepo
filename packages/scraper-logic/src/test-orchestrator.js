// packages/scraper-logic/src/test-orchestrator.js
import { testHeadlineExtraction, scrapeArticleContentForTest } from './scraper/index.js'
import { Source } from '@headlines/models'
import { browserManager } from './browserManager.js' // Import the manager

export async function testScraperRecipe(sourceConfig, articleUrl = null) {
  await browserManager.initialize() // Ensure browser is running for tests
  try {
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
  } finally {
    await browserManager.close() // Close browser after test
  }
}
