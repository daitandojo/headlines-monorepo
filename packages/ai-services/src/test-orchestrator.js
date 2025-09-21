// packages/scraper-logic/src/test-orchestrator.js (NEW FILE)
'use server'

import { testHeadlineExtraction, scrapeArticleContentForTest } from './scraper/index.js'

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
    let firstArticleContent = ''
    if (headlines.length > 0 && sourceConfig.articleSelector) {
      firstArticleContent = await scrapeArticleContentForTest(
        headlines[0].link,
        sourceConfig.articleSelector
      )
    }
    return {
      success: true,
      headlines: {
        count: headlines.length,
        samples: headlines.slice(0, 10),
      },
      content: {
        preview: firstArticleContent,
        sourceUrl: headlines.length > 0 ? headlines[0].link : null,
      },
    }
  }

  throw new Error('Invalid request payload for testScraperRecipe.')
}
