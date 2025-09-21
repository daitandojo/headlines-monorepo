// packages/scraper-logic/src/scraper/index.js (Corrected Exports)
import { scrapeSiteForHeadlines } from './headlineScraper.js'
import { scrapeArticleContent } from './contentScraper.js'
import { testHeadlineExtraction, scrapeArticleContentForTest } from './test-helpers.js'

export {
  scrapeSiteForHeadlines,
  scrapeArticleContent,
  testHeadlineExtraction,
  scrapeArticleContentForTest,
}
