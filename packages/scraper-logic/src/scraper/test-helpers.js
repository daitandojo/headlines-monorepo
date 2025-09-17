// packages/scraper-logic/src/scraper/test-helpers.js (version 2.0)
import * as cheerio from 'cheerio'
import { dynamicExtractor } from './dynamicExtractor.js'
import { extractorRegistry } from './extractors/index.js'
import { fetchPageWithPlaywright } from '../browser.js'

export async function scrapeArticleContentForTest(articleUrl, articleSelectors) {
  if (!articleUrl || !articleSelectors || articleSelectors.length === 0) return ''
  try {
    const html = await fetchPageWithPlaywright(articleUrl, 'TestContentScraper')
    if (!html) return 'Error: Failed to fetch page HTML.';
    
    const $ = cheerio.load(html)
    const selectors = Array.isArray(articleSelectors) ? articleSelectors : [articleSelectors];
    let contentParts = [];
    
    for (const selector of selectors) {
        $(selector).each((_, el) => {
            contentParts.push($(el).text().trim());
        });
    }

    if(contentParts.length > 0) {
        const content = contentParts.join('\\n\\n').replace(/\\s\\s+/g, ' ');
        return content.substring(0, 1000) + (content.length > 1000 ? '...' : '');
    }
    return 'No content found with the provided selectors.';

  } catch (error) {
    console.error(`[Content Scrape Test Error] for ${articleUrl}: ${error.message}`)
    return `Error scraping content: ${error.message}`
  }
}

export async function testHeadlineExtraction(sourceConfig, html) {
  let pageHtml = html
  if (!pageHtml) {
    pageHtml = await fetchPageWithPlaywright(sourceConfig.sectionUrl, 'TestHeadlineScraper')
  }
  const $ = cheerio.load(pageHtml)
  const articles = []
  const selectors = Array.isArray(sourceConfig.headlineSelector) ? sourceConfig.headlineSelector : [sourceConfig.headlineSelector].filter(Boolean);

  for (const selector of selectors) {
    switch (sourceConfig.extractionMethod) {
      case 'json-ld':
        $('script[type="application/ld+json"]').each((_, el) => {
          try {
            const jsonData = JSON.parse($(el).html())
            const potentialLists = [jsonData, ...(jsonData['@graph'] || [])]
            potentialLists.forEach((list) => {
              const items = list?.itemListElement
              if (Array.isArray(items)) {
                items.forEach((item) => {
                  const headline = item.name || item.item?.name
                  const url = item.url || item.item?.url
                  if (headline && url) {
                    articles.push({ headline: headline.trim(), link: new URL(url, sourceConfig.baseUrl).href })
                  }
                })
              }
            })
          } catch (e) {}
        })
        break
      case 'declarative':
        $(selector).each((_, el) => {
          const articleData = dynamicExtractor($, el, sourceConfig)
          if (articleData?.headline && articleData?.link) {
            articleData.link = new URL(articleData.link, sourceConfig.baseUrl).href
            articles.push(articleData)
          }
        })
        break
      case 'custom':
      default:
        const customExtractor = extractorRegistry[sourceConfig.extractorKey]
        if (!customExtractor) {
          throw new Error(`No custom extractor found for key: '${sourceConfig.extractorKey}'`)
        }
        $(selector).each((_, el) => {
          const articleData = customExtractor($(el), sourceConfig)
          if (articleData?.headline && articleData?.link) {
            articleData.link = new URL(articleData.link, sourceConfig.baseUrl).href
            articles.push(articleData)
          }
        })
        break
    }
  }
  return Array.from(new Map(articles.map((a) => [a.link, a])).values())
}
