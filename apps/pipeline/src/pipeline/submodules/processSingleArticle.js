// apps/pipeline/src/pipeline/submodules/processSingleArticle.js
import { logger } from '@headlines/utils-server'
import { articleChain, articlePreAssessmentChain } from '@headlines/ai-services'
import { getConfig } from '@headlines/scraper-logic/config.js'
import { scrapeArticleContent } from '@headlines/scraper-logic/scraper/contentScraper.js'
import { settings } from '@headlines/config/server.js'
import { Source } from '@headlines/models'

function createLifecycleEvent(stage, status, reason) {
  return { stage, status, reason, timestamp: new Date() }
}

async function salvageHighSignalArticle(article) {
  logger.warn(
    { headline: article.headline },
    `SALVAGE MODE: Attempting to find alternative sources for high-signal headline.`
  )
  const config = getConfig()
  const searchResult = await config.utilityFunctions.findAlternativeSources(
    article.headline
  )
  if (!searchResult.success || searchResult.results.length === 0) {
    logger.error(
      { headline: article.headline },
      'SALVAGE FAILED: No alternative sources found.'
    )
    return {
      article: null,
      lifecycleEvent: createLifecycleEvent(
        'salvage',
        'failed',
        'No alternative sources found'
      ),
    }
  }

  for (const altSource of searchResult.results.slice(0, 2)) {
    const tempSourceConfig = { name: altSource.source, articleSelector: 'body' }
    const tempArticle = { ...article, link: altSource.link }
    const contentResult = await scrapeArticleContent(tempArticle, tempSourceConfig)

    if (contentResult.articleContent) {
      const finalAssessment = await articleChain({
        article_text: contentResult.articleContent.contents.join('\n'),
      })
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
        }
      }
    }
  }
  return {
    article: null,
    lifecycleEvent: createLifecycleEvent(
      'salvage',
      'failed',
      'All alternatives failed enrichment'
    ),
  }
}

export async function processSingleArticle(article) {
  let transientArticle
  try {
    let source
    if (article.source === 'Richlist Ingestion') {
      logger.trace('Using mock source config for synthetic rich list article.')
      source = {
        name: 'Richlist Ingestion',
        articleSelector: ['body'],
      }
      transientArticle = article
    } else {
      source = await Source.findOne({ name: article.source }).lean()
      if (!source)
        throw new Error(`Could not find source document for "${article.source}"`)
      transientArticle = await scrapeArticleContent(article, source)
    }

    if (transientArticle.articleContent) {
      const articleText = transientArticle.articleContent.contents.join('\n')
      // DEFINITIVE FIX: Changed from .invoke to direct await
      const triageResult = await articlePreAssessmentChain({ input: articleText })

      if (triageResult.error || triageResult.classification !== 'private') {
        return {
          article: null,
          lifecycleEvent: createLifecycleEvent(
            'enrichment',
            'dropped',
            `Failed AI Triage (classified as ${triageResult.classification})`
          ),
          contentPreview: transientArticle.contentPreview,
        }
      }

      // DEFINITIVE FIX: Changed from .invoke to direct await
      const finalAssessment = await articleChain({ article_text: articleText })

      if (finalAssessment.error) {
        throw new Error(finalAssessment.error)
      }

      if (finalAssessment.relevance_article >= settings.ARTICLES_RELEVANCE_THRESHOLD) {
        return {
          article: finalAssessment,
          lifecycleEvent: createLifecycleEvent(
            'enrichment',
            'success',
            `Final score: ${finalAssessment.relevance_article}`
          ),
          contentPreview: transientArticle.contentPreview,
        }
      } else {
        return {
          article: { ...finalAssessment },
          lifecycleEvent: createLifecycleEvent(
            'enrichment',
            'dropped',
            `Content score ${finalAssessment.relevance_article} < threshold ${settings.ARTICLES_RELEVANCE_THRESHOLD}`
          ),
          contentPreview: transientArticle.contentPreview,
        }
      }
    } else {
      if (article.relevance_headline >= settings.HIGH_SIGNAL_HEADLINE_THRESHOLD) {
        return {
          ...(await salvageHighSignalArticle(article)),
          contentPreview: transientArticle.contentPreview,
        }
      } else {
        return {
          article: null,
          lifecycleEvent: createLifecycleEvent(
            'enrichment',
            'dropped',
            `Content scrape failed and headline score ${article.relevance_headline} was not high-signal`
          ),
          contentPreview: transientArticle.contentPreview,
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
    }
  }
}
