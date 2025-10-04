// packages/scraper-logic/src/scraper/contentScraper.js (version 5.0.0 - Unified Selector Strategy)
import * as cheerio from 'cheerio'
import fs from 'fs/promises'
import path from 'path'
import { JSDOM, VirtualConsole } from 'jsdom'
import { Readability } from '@mozilla/readability'

import { getConfig } from '../config.js'
import { fetchPageWithPlaywright } from '../browser.js'
import { contentExtractorRegistry } from './extractors/index.js'
import { settings } from '@headlines/config/node'

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
    getConfig().logger.error({ err: error, file: filename }, 'Failed to save debug HTML.')
    return null
  }
}

function extractWithReadability(url, html) {
  try {
    const virtualConsole = new VirtualConsole()
    virtualConsole.on('cssParseError', () => {})
    const doc = new JSDOM(html, {
      url,
      virtualConsole,
      resources: 'usable',
    })
    const reader = new Readability(doc.window.document)
    const article = reader.parse()
    return article?.textContent || null
  } catch (e) {
    getConfig().logger.warn({ err: e, url }, 'Readability.js failed to parse article.')
    return null
  }
}

export async function scrapeArticleContent(article, source) {
  if (
    source.extractionMethod === 'custom' &&
    contentExtractorRegistry[source.extractorKey]
  ) {
    return await contentExtractorRegistry[source.extractorKey](article, source)
  }

  if (article.rssContent && article.rssContent.length >= settings.MIN_ARTICLE_CHARS) {
    article.articleContent = { contents: [article.rssContent] }
    return article
  }

  const html = await fetchPageWithPlaywright(article.link, 'ContentScraper')
  if (!html) {
    return { ...article, enrichment_error: 'Playwright failed to fetch page HTML' }
  }

  const $ = cheerio.load(html)
  let contentParts = []
  let extractionMethod = 'None'
  let contentText = ''

  // DEFINITIVE FIX: Unified Selector Strategy
  // If articleSelector is defined, use it as the primary, authoritative method.
  const selectors = Array.isArray(source.articleSelector)
    ? source.articleSelector
    : [source.articleSelector].filter(Boolean)

  if (selectors.length > 0) {
    extractionMethod = 'Cheerio Multi-Selector'
    for (const selector of selectors) {
      // Grab text from each matching element and push to the array
      $(selector).each((_, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim()
        if (text) {
          contentParts.push(text)
        }
      })
    }
    // Join the unique parts together. Using a Set handles cases where selectors might overlap.
    contentText = [...new Set(contentParts)].join('\n\n')
  }

  // Fallback to Readability.js ONLY if the selector-based method fails or is not configured.
  if (!contentText || contentText.length < settings.MIN_ARTICLE_CHARS) {
    const readabilityText = extractWithReadability(article.link, html)
    if (readabilityText && readabilityText.length > contentText.length) {
      contentText = readabilityText
      extractionMethod = 'Readability.js Fallback'
    }
  }

  if (contentText && contentText.length >= settings.MIN_ARTICLE_CHARS) {
    article.articleContent = { contents: [contentText] }
    getConfig().logger.trace(
      {
        article: {
          headline: article.headline,
          chars: contentText.length,
          method: extractionMethod,
        },
      },
      `✅ Content enrichment successful.`
    )
  } else {
    const reason = !contentText
      ? `All extraction methods failed.`
      : `Content too short (` + (contentText ? contentText.length : 0) + ` chars).`
    article.enrichment_error = reason
    article.contentPreview = contentText ? contentText.substring(0, 100) : ''
    const filename =
      source.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_content_fail.html'
    await saveDebugHtml(filename, html)
  }
  return article
}
