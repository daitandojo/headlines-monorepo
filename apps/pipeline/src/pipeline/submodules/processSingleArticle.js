// apps/pipeline/src/pipeline/submodules/processSingleArticle.js
import { logger } from '@headlines/utils-shared'
import {
  assessArticleContent,
  preAssessArticle,
  findAlternativeSources,
  performGoogleSearch,
} from '@headlines/ai-services/node'
import { scrapeArticleContent } from '@headlines/scraper-logic/scraper/index.js'
import { settings } from '@headlines/config/node'
import { Source } from '@headlines/models'

function createLifecycleEvent(stage, status, reason) {
  return { stage, status, reason, timestamp: new Date() }
}

async function salvageHighSignalArticle(article, hits) {
  logger.warn(
    { headline: article.headline },
    `SALVAGE MODE: Attempting to find alternative sources for high-signal headline.`
  )

  // First, try to find an alternative, scrapeable source.
  const searchResult = await findAlternativeSources(article.headline)
  if (searchResult.success && searchResult.results.length > 0) {
    for (const altSource of searchResult.results.slice(0, 2)) {
      const tempSourceConfig = { name: altSource.source, articleSelector: 'body' }
      const tempArticle = { ...article, link: altSource.link }
      const contentResult = await scrapeArticleContent(tempArticle, tempSourceConfig)
      if (contentResult.articleContent) {
        const finalAssessment = await assessArticleContent(contentResult, hits, true)
        if (
          finalAssessment &&
          !finalAssessment.error &&
          finalAssessment.relevance_article >= settings.ARTICLES_RELEVANCE_THRESHOLD
        ) {
          logger.info(
            { headline: article.headline },
            'SALVAGE SUCCESS: Successfully enriched from alternative source.'
          )
          const salvagedArticle = {
            ...finalAssessment,
            assessment_article: `[SALVAGED] ${finalAssessment.assessment_article}`,
          }
          return {
            article: salvagedArticle,
            lifecycleEvent: createLifecycleEvent(
              'salvage',
              'success',
              `Used alternative source: ${altSource.link}`
            ),
            contentPreview: contentResult.contentPreview,
            rawHtml: contentResult.rawHtml,
            extractionMethod: 'Salvage-Readability',
            extractionSelectors: ['body'],
          }
        }
      }
    }
  }

  // SECOND-LEVEL SALVAGE: If alternative sources fail, use Google Search snippets as context.
  logger.warn(
    { headline: article.headline },
    'SALVAGE RAG MODE: Alternative sources failed. Using Google Search snippets for context.'
  )
  const googleResult = await performGoogleSearch(article.headline)
  if (googleResult.success && googleResult.snippets) {
    const finalAssessment = await assessArticleContent(
      article,
      hits,
      false,
      googleResult.snippets
    )
    if (
      finalAssessment &&
      !finalAssessment.error &&
      finalAssessment.relevance_article >= settings.ARTICLES_RELEVANCE_THRESHOLD
    ) {
      logger.info(
        { headline: article.headline },
        'SALVAGE SUCCESS: Successfully enriched using Google Search context.'
      )
      const salvagedArticle = {
        ...finalAssessment,
        assessment_article: `[SALVAGED VIA RAG] ${finalAssessment.assessment_article}`,
      }
      return {
        article: salvagedArticle,
        lifecycleEvent: createLifecycleEvent(
          'salvage',
          'success',
          'Used Google Search snippets for context.'
        ),
        contentPreview: googleResult.snippets,
        rawHtml: `Google Snippets for ${article.headline}`,
        extractionMethod: 'Salvage-RAG',
        extractionSelectors: [],
      }
    }
  }

  logger.error(
    { headline: article.headline },
    'SALVAGE FAILED: All salvage attempts failed.'
  )
  return {
    article: null,
    lifecycleEvent: createLifecycleEvent(
      'salvage',
      'failed',
      'All alternatives and RAG failed'
    ),
    contentPreview: 'N/A',
    rawHtml: 'N/A',
    extractionMethod: 'Salvage',
    extractionSelectors: [],
  }
}

export async function processSingleArticle(article, hits) {
  let transientArticle
  try {
    let source
    if (article.source === 'Richlist Ingestion') {
      logger.trace('Using mock source config for synthetic rich list article.')
      source = {
        name: 'Richlist Ingestion',
        articleSelector: ['body'],
      }
      transientArticle = {
        ...article,
        rawHtml: `Synthetic Article for ${article.headline}`,
        extractionMethod: 'Synthetic',
        extractionSelectors: [],
      }
    } else {
      source = await Source.findOne({ name: article.source }).lean()
      if (!source)
        throw new Error(`Could not find source document for "${article.source}"`)
      transientArticle = await scrapeArticleContent(article, source)
    }

    const baseResult = {
      contentPreview: transientArticle.contentPreview,
      rawHtml: transientArticle.rawHtml,
      extractionMethod: transientArticle.extractionMethod,
      extractionSelectors: transientArticle.extractionSelectors,
    }

    // NEW LOGIC: Proceed if we have ANY content, even just a snippet.
    if (
      transientArticle.articleContent &&
      transientArticle.articleContent.contents.length > 0
    ) {
      const articleText = transientArticle.articleContent.contents.join('\n')
      const triageResult = await preAssessArticle(articleText, hits)

      if (triageResult.error || triageResult.classification !== 'private') {
        return {
          ...baseResult,
          article: null,
          lifecycleEvent: createLifecycleEvent(
            'enrichment',
            'dropped',
            `Failed AI Triage (classified as ${triageResult.classification})`
          ),
        }
      }

      const finalAssessment = await assessArticleContent(transientArticle, hits)

      if (finalAssessment.error) throw new Error(finalAssessment.error)

      if (finalAssessment.relevance_article >= settings.ARTICLES_RELEVANCE_THRESHOLD) {
        return {
          ...baseResult,
          article: finalAssessment,
          lifecycleEvent: createLifecycleEvent(
            'enrichment',
            'success',
            `Final score: ${finalAssessment.relevance_article}`
          ),
        }
      } else {
        return {
          ...baseResult,
          article: { ...finalAssessment },
          lifecycleEvent: createLifecycleEvent(
            'enrichment',
            'dropped',
            `Content score ${finalAssessment.relevance_article} < threshold ${settings.ARTICLES_RELEVANCE_THRESHOLD}`
          ),
        }
      }
    } else {
      // If content scraping failed completely...
      if (article.relevance_headline >= settings.HIGH_SIGNAL_HEADLINE_THRESHOLD) {
        // ...and it's a high-signal headline, try to salvage it with external tools.
        const salvageResult = await salvageHighSignalArticle(article, hits)
        return { ...baseResult, ...salvageResult }
      } else {
        // ...otherwise, drop it.
        return {
          ...baseResult,
          article: null,
          lifecycleEvent: createLifecycleEvent(
            'enrichment',
            'dropped',
            `Content scrape failed and headline score ${article.relevance_headline} was not high-signal`
          ),
        }
      }
    }
  } catch (error) {
    logger.error(
      { err: error, articleLink: article.link },
      'Critical error during single article processing.'
    )
    return {
      article: null,
      lifecycleEvent: createLifecycleEvent('enrichment', 'error', error.message),
      contentPreview: transientArticle?.contentPreview,
      rawHtml: transientArticle?.rawHtml,
      extractionMethod: transientArticle?.extractionMethod,
      extractionSelectors: transientArticle?.extractionSelectors,
    }
  }
}
