// apps/headlines-pipeline/src/scraper/discovery.ts
// File 5 of 10
// One-line rationale: Fixing import from @wealth/access.

import { HeadlinesScraper } from './index.js'
import { load } from 'cheerio'
import { getActiveSources, bulkUpsertArticles } from '@wealth/access' // Fixed import

interface DiscoveredHeadline {
  headline: string
  link: string
  sourceName: string
}

export class SourceDiscovery {
  private scraper: HeadlinesScraper

  constructor(scraper: HeadlinesScraper) {
    this.scraper = scraper
  }

  async run(): Promise<DiscoveredHeadline[]> {
    console.log('🔎 [Discovery] Fetching active sources...')

    const sources = await getActiveSources()

    if (sources.length === 0) {
      console.warn('⚠️ [Discovery] No active sources found in DB.')
      return []
    }

    console.log(`🔎 [Discovery] Processing ${sources.length} sources...`)
    const allHeadlines: DiscoveredHeadline[] = []

    for (const source of sources) {
      try {
        const headlines = await this.processSource(source)
        console.log(`  -> ${source.name}: Found ${headlines.length} headlines.`)
        allHeadlines.push(...headlines)
      } catch (e: any) {
        console.error(`❌ [Discovery] Failed source ${source.name}:`, e.message)
      }
    }

    return allHeadlines
  }

  private async processSource(source: any): Promise<DiscoveredHeadline[]> {
    const { sectionUrl, headlineSelector } = source

    const { rawHtml } = await this.scraper.scrapeArticle(sectionUrl)

    const $ = load(rawHtml)
    const headlines: DiscoveredHeadline[] = []
    const seenLinks = new Set<string>()

    const selector =
      Array.isArray(headlineSelector) && headlineSelector.length > 0
        ? headlineSelector[0]
        : 'a h2, h2 a, h3 a, .headline a'

    $(selector).each((_, el) => {
      const $el = $(el)
      let $link = $el.is('a') ? $el : $el.closest('a')
      if ($link.length === 0) $link = $el.find('a').first()

      if ($link.length > 0) {
        const href = $link.attr('href')
        const text = $el.text().trim().replace(/\s+/g, ' ')

        if (href && text.length > 15) {
          try {
            const absoluteUrl = new URL(href, sectionUrl).href

            if (!seenLinks.has(absoluteUrl)) {
              headlines.push({
                headline: text,
                link: absoluteUrl,
                sourceName: source.name,
              })
              seenLinks.add(absoluteUrl)
            }
          } catch (e) {
            /* ignore */
          }
        }
      }
    })

    if (headlines.length > 0) {
      const articlesToUpsert = headlines.map((h) => ({
        link: h.link,
        headline: h.headline,
        newspaper: h.sourceName,
        source: 'Discovery',
        status: 'scraped',
        relevance_headline: 0,
        createdAt: new Date(),
      }))

      await bulkUpsertArticles(articlesToUpsert)
    }

    return headlines
  }
}
