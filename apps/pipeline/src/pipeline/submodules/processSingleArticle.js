// apps/pipeline/src/pipeline/submodules/processSingleArticle.js
import { logger } from '@headlines/utils-shared'
import {
  assessArticleContent,
  findAlternativeSources,
  performGoogleSearch,
} from '@headlines/ai-services'
import { scrapeArticleContent } from '@headlines/scraper-logic/scraper/index.js'
import { settings } from '@headlines/config'
import { Source } from '@headlines/models'
import { downloadArticleImage } from '../../utils/imageDownloader.js'

const HEADLINE_ONLY_THRESHOLD = 60
const MIN_PAYWALL_SALVAGE_CHARS = 500

function createLifecycleEvent(stage, status, reason) {
  return { stage, status, reason, timestamp: new Date() }
}

function isPaywalledPreview(text) {
  return text.length < MIN_PAYWALL_SALVAGE_CHARS
}

async function salvageHighSignalArticle(article, hits) {
  logger.warn(
    { headline: article.headline },
    `SALVAGE MODE: Attempting to find alternative sources for high-signal headline.`
  )

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

async function createHeadlineOnlyEntry(article, finalAssessment, reason) {
  return {
    contentPreview: '',
    rawHtml: '',
    extractionMethod: 'HeadlineOnly',
    extractionSelectors: [],
    article: {
      ...(finalAssessment || {}),
      richness_source: 'headline_only',
      relevance_article: article.relevance_headline || 60,
      assessment_article: `[HEADLINE ONLY - paywall or content blocked] This article's content could not be extracted. However, the headline is promising.
Headline: "${article.headline}"
Assessment: ${article.assessment_headline || 'Promising headline'}
Source: ${article.newspaper}, Link: ${article.link}
IMPORTANT: Search the web for this individual/company to find actual details. The company or person named in the headline needs to be researched.`,
    },
    lifecycleEvent: createLifecycleEvent('enrichment', 'headline_only', reason),
  }
}

async function attemptSalvageOrHeadlineOnly(article, hits, context) {
  const salvageResult = await salvageHighSignalArticle(article, hits)
  if (salvageResult.article) return salvageResult
  return createHeadlineOnlyEntry(article, null, context)
}

export async function processSingleArticle(article, hits) {
  let transientArticle
  try {
    let source
    if (article.source === 'Test E2E Source') {
      logger.trace('Using mock source config for synthetic test article.')
      source = {
        name: 'Test E2E Source',
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

    if (
      transientArticle.articleContent &&
      transientArticle.articleContent.contents.length > 0
    ) {
      const articleText = transientArticle.articleContent.contents.join('\n')
      logger.info(
        {
          articleLink: article.link,
          charCount: articleText.length,
          method: transientArticle.articleContent.method,
          contentSnippet: articleText.substring(0, 400) + '...',
        },
        'Extracted content for full assessment.'
      )

      const finalAssessment = await assessArticleContent(transientArticle, hits)
      if (finalAssessment.error) throw new Error(finalAssessment.error)

      if (finalAssessment.relevance_article >= settings.ARTICLES_RELEVANCE_THRESHOLD) {
        if (article.imageUrl && !finalAssessment.imageCachedPath) {
          const cachedPath = await downloadArticleImage(article.imageUrl, article._id, article.source)
          if (cachedPath) finalAssessment.imageCachedPath = cachedPath
        }
        return {
          ...baseResult,
          article: finalAssessment,
          lifecycleEvent: createLifecycleEvent(
            'enrichment', 'success',
            `Final score: ${finalAssessment.relevance_article}`
          ),
        }
      }

      // Content score too low — check if it's paywalled with a strong headline
      if (article.relevance_headline >= HEADLINE_ONLY_THRESHOLD && isPaywalledPreview(articleText)) {
        return attemptSalvageOrHeadlineOnly(article, hits,
          `Paywall: content ${finalAssessment.relevance_article}/${settings.ARTICLES_RELEVANCE_THRESHOLD}, headline ${article.relevance_headline} >= ${HEADLINE_ONLY_THRESHOLD}`
        )
      }

      return { ...baseResult, article: { ...finalAssessment }, lifecycleEvent: createLifecycleEvent('enrichment', 'dropped',
        `Content score ${finalAssessment.relevance_article} < threshold ${settings.ARTICLES_RELEVANCE_THRESHOLD}`
      )}
    }

    // No content extracted at all
    if (article.relevance_headline >= HEADLINE_ONLY_THRESHOLD) {
      return attemptSalvageOrHeadlineOnly(article, hits,
        `No content, headline ${article.relevance_headline} >= ${HEADLINE_ONLY_THRESHOLD}`
      )
    }

    return { ...baseResult, article: null, lifecycleEvent: createLifecycleEvent('enrichment', 'dropped',
      `Content scrape failed and headline ${article.relevance_headline} < ${HEADLINE_ONLY_THRESHOLD}`
    )}
  } catch (error) {
    logger.error({ err: error, articleLink: article.link }, 'Critical error during single article processing.')
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