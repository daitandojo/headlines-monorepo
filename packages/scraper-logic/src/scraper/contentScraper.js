// packages/scraper-logic/src/scraper/contentScraper.js
import { JSDOM, VirtualConsole } from 'jsdom'
import { Readability } from '@mozilla/readability'
import * as cheerio from 'cheerio'
import { getConfig } from '../config.js'
import { fetchPageWithPlaywright } from '../browser.js'
import { contentExtractorRegistry } from './extractors/index.js'
import { settings } from '@headlines/config/node'

/**
 * Extracts image metadata (URL, alt text, caption) from HTML page.
 * Used to extract names from article hero images (e.g., "Baron Johan Wedell-Wedellsborg").
 * @param {string} html - Raw HTML of the page.
 * @returns {Object} Image metadata { imageUrl, imageAlt, imageCaption }
 */
function extractImageMetadata(html) {
  if (!html) return { imageUrl: null, imageAlt: null, imageCaption: null }
  
  const $ = cheerio.load(html)
  
  let imageUrl = null
  let imageAlt = null
  let imageCaption = null

  // Priority 1: og:image meta tag (most reliable for article hero image)
  const ogImage = $('meta[property="og:image"]').attr('content')
  if (ogImage) {
    imageUrl = ogImage
  }

  // Priority 2: twitter:image as fallback
  if (!imageUrl) {
    const twitterImage = $('meta[name="twitter:image"]').attr('content')
    if (twitterImage) imageUrl = twitterImage
  }

  // Priority 3: first large article image
  if (!imageUrl) {
    const articleImg = $('article img, .article-image img, .content img, main img')
      .filter((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || ''
        return src.length > 20
      })
      .first()
      .attr('src')
    if (articleImg) imageUrl = articleImg
  }

  // Extract alt text for the og:image
  if (imageUrl) {
    const allImgs = $('img')
    allImgs.each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || ''
      if (imageUrl.includes(src.split('/').pop()) || src.includes(imageUrl.split('/').pop())) {
        const alt = $(el).attr('alt')
        if (alt && alt.length > 3) imageAlt = alt
      }
    })
  }

  // Extract figcaption or image caption (photo credit / byline text near the image)
  // Look for figure > figcaption, or image wrappers with credit text
  const figcaption = $('figcaption').first().text().trim()
  if (figcaption && figcaption.length > 5) {
    imageCaption = figcaption
  }

  // Fallback: look for image credit / photo credit text
  if (!imageCaption) {
    const credit = $('[class*="credit"], [class*="photo-credit"], [class*="billedtekst"]').first().text().trim()
    if (credit && credit.length > 5) imageCaption = credit
  }

  // Extract from og:image:alt or og:image:secure_url (some sites use these)
  const ogImageAlt = $('meta[property="og:image:alt"]').attr('content')
  if (ogImageAlt) imageAlt = ogImageAlt

  return { imageUrl, imageAlt, imageCaption }
}

/**
 * Cleans and formats text extracted by Readability or other methods.
 * @param {string} text - The raw text content.
 * @returns {string} The cleaned text.
 */
function cleanText(text) {
  if (!text) return ''
  // Normalize whitespace and ensure meaningful paragraph breaks.
  return text
    .replace(/\s\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()
}

/**
 * A fallback text extractor used only when Readability fails, to provide a snippet for logging.
 * @param {string} html - The raw HTML of the page.
 * @returns {string} A raw text snippet from the body.
 */
function extractFallbackSnippet(html) {
  if (!html) return ''
  const $ = cheerio.load(html)
  $('script, style, nav, footer, header, aside, form, button').remove()
  return $('body').text().replace(/\s+/g, ' ').trim()
}

/**
 * The new universal content extractor. It uses a prioritized, multi-strategy approach.
 * 1. Custom Extractor (if defined)
 * 2. RSS Content (if available)
 * 3. Mozilla's Readability (primary method)
 * @param {object} article - The article object with a 'link' property.
 * @param {object} source - The source document.
 * @returns {Promise<object>} The article object, enriched with content or an error.
 */
export async function scrapeArticleContent(article, source) {
  const logger = getConfig().logger
  const startTime = Date.now()

  // Strategy 1: Custom Extractor (for special cases like popups)
  if (
    source.extractionMethod === 'custom' &&
    contentExtractorRegistry[source.extractorKey]
  ) {
    try {
      logger.trace(
        { extractorKey: source.extractorKey },
        'Using custom content extractor.'
      )
      return await contentExtractorRegistry[source.extractorKey](article, source)
    } catch (error) {
      logger.error(
        { err: error, extractorKey: source.extractorKey },
        'Custom content extractor failed. Falling back to standard methods.'
      )
    }
  }

  // Strategy 2: RSS Content (fast and reliable if available)
  if (article.rssContent && article.rssContent.length >= settings.MIN_ARTICLE_CHARS) {
    // --- START OF DEFINITIVE FIX ---
    // The function was named `cleanReadabilityText` in a previous version. It is now `cleanText`.
    const cleanedRss = cleanText(article.rssContent)
    // --- END OF DEFINITIVE FIX ---
    if (cleanedRss.length >= settings.MIN_ARTICLE_CHARS) {
      logger.trace(
        { headline: article.headline },
        'Using high-quality content from RSS feed.'
      )
      return {
        ...article,
        articleContent: { contents: [cleanedRss], method: 'RSS Feed' },
        rawHtml: `RSS Content for ${article.headline}`,
        extractionMethod: 'RSS',
      }
    }
  }

  // Strategy 3: Readability (The Universal Default)
  const html = await fetchPageWithPlaywright(article.link, 'UniversalContentScraper')

  if (!html) {
    return {
      ...article,
      enrichment_error: 'Playwright failed to fetch page HTML',
      contentPreview: '',
      rawHtml: null,
      extractionMethod: 'Readability',
    }
  }

  try {
    const virtualConsole = new VirtualConsole()
    virtualConsole.on('cssParseError', () => {})
    const doc = new JSDOM(html, { url: article.link, virtualConsole })
    const reader = new Readability(doc.window.document, {
      charThreshold: settings.MIN_ARTICLE_CHARS,
    })
    const readabilityArticle = reader.parse()

    if (!readabilityArticle || !readabilityArticle.textContent) {
      throw new Error('Readability failed to extract a main article body.')
    }

    // --- START OF DEFINITIVE FIX ---
    // The function was named `cleanReadabilityText` in a previous version. It is now `cleanText`.
    const content = cleanText(readabilityArticle.textContent)
    // --- END OF DEFINITIVE FIX ---

    if (content.length < settings.MIN_ARTICLE_CHARS) {
      throw new Error(
        `Extracted content is too short (${content.length} chars). Likely a paywall or error page.`
      )
    }

    const duration = Date.now() - startTime
    logger.trace(
      {
        article: {
          headline: article.headline,
          chars: content.length,
          duration: `${duration}ms`,
        },
      },
      '✅ Universal content extraction successful'
    )

    const { imageUrl: extractedOgImage, imageAlt: extractedImageAlt, imageCaption: extractedImageCaption } = extractImageMetadata(html)

    return {
      ...article,
      articleContent: { contents: [content], method: 'Readability.js' },
      rawHtml: html,
      extractionMethod: 'Readability',
      ogImage: extractedOgImage,
      imageAlt: extractedImageAlt,
      imageCaption: extractedImageCaption,
    }
  } catch (error) {
    logger.warn(
      { article: { headline: article.headline, link: article.link }, err: error.message },
      '❌ Universal content extraction failed'
    )
    const { imageUrl: extractedOgImage, imageAlt: extractedImageAlt, imageCaption: extractedImageCaption } = extractImageMetadata(html)
    return {
      ...article,
      enrichment_error: `Readability Failed: ${error.message}`,
      contentPreview: extractFallbackSnippet(html).substring(0, 300),
      rawHtml: html,
      extractionMethod: 'Readability',
      ogImage: extractedOgImage,
      imageAlt: extractedImageAlt,
      imageCaption: extractedImageCaption,
    }
  }
}
