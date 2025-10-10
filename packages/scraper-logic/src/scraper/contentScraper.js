// packages/scraper-logic/src/scraper/contentScraper.js
import * as cheerio from 'cheerio'
import fs from 'fs/promises'
import path from 'path'
import { JSDOM, VirtualConsole } from 'jsdom'
import { Readability } from '@mozilla/readability'

import { getConfig } from '../config.js'
import { fetchPageWithPlaywright } from '../browser.js'
import { contentExtractorRegistry } from './extractors/index.js'
import { settings } from '@headlines/config/node'

const QUALITY_WEIGHTS = {
  length: 0.3,
  paragraphs: 0.2,
  linkDensity: 0.15,
  punctuation: 0.15,
  wordVariety: 0.2,
}

function getQualityWeights(source) {
  return source.qualityWeights || QUALITY_WEIGHTS
}

async function saveDebugHtml(filename, html) {
  const config = getConfig()
  const debugDir = config.paths?.debugHtmlDir
  if (!debugDir) return null

  try {
    await fs.mkdir(debugDir, { recursive: true })
    const filePath = path.join(debugDir, filename)
    await fs.writeFile(filePath, html)
    return filePath
  } catch (error) {
    config.logger.error({ err: error, file: filename }, 'Failed to save debug HTML.')
    return null
  }
}

function cleanText(text) {
  if (!text) return ''
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim()
}

function calculateContentQuality(content, $, weights = QUALITY_WEIGHTS) {
  if (!content) return 0
  const words = content.split(/\s+/)
  const wordCount = words.length
  const lengthScore = Math.min(wordCount / 500, 5000 / Math.max(wordCount, 1)) / 5
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 50)
  const paragraphScore = Math.min(paragraphs.length / 10, 1)
  const linkTextLength = $('a').text().length
  const totalTextLength = $.text().length
  const linkDensity = totalTextLength > 0 ? linkTextLength / totalTextLength : 0
  const linkScore = Math.max(0, 1 - linkDensity * 2)
  const punctuationCount = (content.match(/[.!?]/g) || []).length
  const punctuationScore = Math.min(punctuationCount / (wordCount / 20), 1)
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()))
  const varietyScore = wordCount > 0 ? uniqueWords.size / wordCount : 0
  return (
    lengthScore * weights.length +
    paragraphScore * weights.paragraphs +
    linkScore * weights.linkDensity +
    punctuationScore * weights.punctuation +
    varietyScore * weights.wordVariety
  )
}

function extractWithReadability(url, html) {
  try {
    const virtualConsole = new VirtualConsole()
    virtualConsole.on('cssParseError', () => {})
    virtualConsole.on('jsdomError', () => {})
    const doc = new JSDOM(html, { url, virtualConsole, resources: 'usable' })
    const reader = new Readability(doc.window.document, {
      charThreshold: settings.MIN_ARTICLE_CHARS || 500,
      classesToPreserve: ['caption', 'credit'],
    })
    const article = reader.parse()
    if (!article?.textContent) return null
    return {
      content: cleanText(article.textContent),
      title: article.title,
      excerpt: article.excerpt,
      byline: article.byline,
      length: article.length,
    }
  } catch (error) {
    getConfig().logger.warn(
      { err: error, url },
      'Readability.js failed to parse article.'
    )
    return null
  }
}

function extractWithSelectors($, selectors) {
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors].filter(Boolean)
  if (selectorArray.length === 0) return { content: '', selectors: [] }
  const usedSelectors = []
  const processedElements = new Set()
  const contentParts = []
  for (const selector of selectorArray) {
    try {
      const elements = $(selector)
      if (elements.length > 0) {
        usedSelectors.push(selector)
        elements.each((_, el) => {
          if (processedElements.has(el)) return
          processedElements.add(el)
          const $el = $(el).clone()
          $el.find('script, style, nav, aside, footer, header').remove()
          const text = $el.text().replace(/\s+/g, ' ').trim()
          if (text && text.length > 50) contentParts.push(text)
        })
      }
    } catch (error) {
      getConfig().logger.warn({ selector, err: error }, 'Selector extraction failed')
    }
  }
  const finalContent = contentParts.join('\n\n')
  return { content: cleanText(finalContent), selectors: usedSelectors }
}

function detectContentBlockers($) {
  const blockers = {
    paywall: false,
    subscription: false,
    cookieNotice: false,
    loginRequired: false,
  }
  const paywallIndicators = [
    '[class*="paywall"]',
    '[id*="paywall"]',
    '[class*="subscription"]',
    '[class*="premium"]',
    '[class*="subscriber"]',
    'meta[name="article:paywall"]',
  ]
  const loginIndicators = [
    '[class*="login-required"]',
    '[class*="sign-in"]',
    '*:contains("sign in to continue")',
  ]
  blockers.paywall = paywallIndicators.some((selector) => $(selector).length > 0)
  blockers.loginRequired = loginIndicators.some((selector) => $(selector).length > 0)
  blockers.cookieNotice = $('[class*="cookie"], [id*="cookie"]').length > 0
  return blockers
}

export async function scrapeArticleContent(article, source) {
  const logger = getConfig().logger
  const startTime = Date.now()
  if (
    source.extractionMethod === 'custom' &&
    contentExtractorRegistry[source.extractorKey]
  ) {
    try {
      logger.trace({ extractorKey: source.extractorKey }, 'Using custom extractor')
      return await contentExtractorRegistry[source.extractorKey](article, source)
    } catch (error) {
      logger.error(
        { err: error, extractorKey: source.extractorKey },
        'Custom extractor failed'
      )
    }
  }
  if (article.rssContent && article.rssContent.length >= settings.MIN_ARTICLE_CHARS) {
    const cleanedRss = cleanText(article.rssContent)
    if (cleanedRss.length >= settings.MIN_ARTICLE_CHARS) {
      article.articleContent = {
        contents: [cleanedRss],
        method: 'RSS Feed',
        quality: 'medium',
      }
      logger.trace({ headline: article.headline }, 'Using RSS content')
      return { ...article, rawHtml: `RSS Content for ${article.headline}` }
    }
  }
  const html = await fetchPageWithPlaywright(article.link, 'ContentScraper')
  if (!html) {
    return {
      ...article,
      enrichment_error: 'Playwright failed to fetch page HTML',
      contentPreview: '',
      rawHtml: null,
    }
  }
  const $ = cheerio.load(html)
  const blockers = detectContentBlockers($)
  const selectorResult = extractWithSelectors($, source.articleSelector)
  const readabilityResult = extractWithReadability(article.link, html)
  const weights = getQualityWeights(source)
  const candidates = [
    {
      content: selectorResult.content,
      method: 'CSS Selectors',
      quality: calculateContentQuality(selectorResult.content, $, weights),
      metadata: { selectors: selectorResult.selectors },
    },
    {
      content: readabilityResult?.content || '',
      method: 'Readability.js',
      quality: calculateContentQuality(readabilityResult?.content || '', $, weights),
      metadata: { title: readabilityResult?.title, byline: readabilityResult?.byline },
    },
  ].filter((c) => c.content.length >= settings.MIN_ARTICLE_CHARS)

  candidates.sort((a, b) => b.quality - a.quality)
  let bestResult = candidates[0]

  // FALLBACK: If primary methods fail, try to find a pre-paywall summary/lede
  if (!bestResult) {
    logger.warn(
      { headline: article.headline },
      'Primary content extraction failed. Attempting to find pre-paywall lede text.'
    )
    const ledeSelectors = [
      '.summary',
      '.vrs-article-header__summary',
      '.article__summary',
      '.lede',
      '.dek',
      'p[itemprop="description"]',
    ]
    const ledeResult = extractWithSelectors($, ledeSelectors)
    if (ledeResult.content.length >= settings.MIN_ARTICLE_CHARS) {
      bestResult = {
        content: ledeResult.content,
        method: 'Lede Snippet',
        quality: 0.5, // Assign a medium base quality
        metadata: { selectors: ledeResult.selectors },
      }
      logger.info(
        { headline: article.headline },
        'Successfully extracted pre-paywall snippet as fallback content.'
      )
    }
  }

  if (bestResult) {
    article.articleContent = {
      contents: [bestResult.content],
      method: bestResult.method,
      quality:
        bestResult.quality > 0.7 ? 'high' : bestResult.quality > 0.4 ? 'medium' : 'low',
      metadata: bestResult.metadata,
    }
    const duration = Date.now() - startTime
    logger.trace(
      {
        article: {
          headline: article.headline,
          chars: bestResult.content.length,
          method: bestResult.method,
          quality: bestResult.quality.toFixed(2),
          duration: `${duration}ms`,
        },
      },
      '✅ Content enrichment successful'
    )
  } else {
    let errorReason = 'All extraction methods failed'
    const previewContent = selectorResult.content || readabilityResult?.content || ''
    if (blockers.paywall) {
      errorReason = `Paywall detected. Extracted only ${previewContent.length} chars.`
    } else if (blockers.loginRequired) {
      errorReason = `Login required. Content inaccessible.`
    } else if (
      previewContent.length > 0 &&
      previewContent.length < settings.MIN_ARTICLE_CHARS
    ) {
      errorReason = `Content too short (${previewContent.length} chars, minimum ${settings.MIN_ARTICLE_CHARS}).`
    }
    article.enrichment_error = errorReason
    article.contentPreview = previewContent ? previewContent.substring(0, 200) : ''
    const filename = `${source.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}_fail.html`
    await saveDebugHtml(filename, html)
    logger.warn(
      {
        article: { headline: article.headline, link: article.link },
        reason: errorReason,
        blockers,
      },
      '❌ Content enrichment failed'
    )
  }

  return {
    ...article,
    rawHtml: html,
    extractionMethod: bestResult?.method || 'N/A',
    extractionSelectors:
      bestResult?.metadata?.selectors || selectorResult.selectors || [],
  }
}
