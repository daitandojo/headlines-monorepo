// apps/pipeline/scripts/sources/discover-sections.js (version 2.0)
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as cheerio from 'cheerio'
import { fetchPageWithPlaywright } from '@headlines/scraper-logic/src/browser.js'
import { heuristicallyFindSelectors } from '@headlines/scraper-logic/src/scraper/selectorOptimizer.js'
import { sectionClassifierAgent } from '@headlines/scraper-logic/src/ai/index.js'
import { logger } from '../../../../packages/utils-server'
import pLimit from 'p-limit'

const CONCURRENCY = 3

async function main() {
  const argv = yargs(hideBin(process.argv)).usage('Usage: $0 --url <URL>').option('url', {
    alias: 'u',
    type: 'string',
    description: 'The base URL of the news site to discover sections from.',
    demandOption: true,
  }).argv

  const baseUrl = argv.url
  const baseUrlObj = new URL(baseUrl)
  logger.info(`🔎 Discovering news sections for: ${baseUrl} (AI-Powered)`)

  const html = await fetchPageWithPlaywright(baseUrl, 'SectionDiscoverer')
  if (!html) {
    logger.error('Failed to fetch base page content. Aborting.')
    return
  }

  const $ = cheerio.load(html)
  const allLinks = []
  $('a').each((_, el) => {
    const $el = $(el)
    const href = $el.attr('href')
    const text = $el.text().trim().replace(/\s+/g, ' ')

    if (href && text && !href.startsWith('#') && !href.startsWith('mailto:')) {
      try {
        const fullUrl = new URL(href, baseUrl).href
        if (new URL(fullUrl).hostname.endsWith(baseUrlObj.hostname)) {
          allLinks.push({ text, href: fullUrl })
        }
      } catch (e) {
        /* ignore invalid URLs */
      }
    }
  })

  const uniqueLinks = [...new Map(allLinks.map((item) => [item.href, item])).values()]
  logger.info(`Found ${uniqueLinks.length} unique internal links. Classifying with AI...`)

  const classifications = await sectionClassifierAgent(uniqueLinks)
  if (!classifications) {
    logger.error('AI link classification failed. Aborting.')
    return
  }

  const topCandidates = uniqueLinks
    .map((link, i) => ({ ...link, classification: classifications[i].classification }))
    .filter((link) => link.classification === 'news_section')

  if (topCandidates.length === 0) {
    logger.warn('AI analysis did not identify any promising "news_section" links.')
    return
  }

  logger.info(
    `AI identified ${topCandidates.length} promising sections. Verifying for headlines...`
  )

  const limit = pLimit(CONCURRENCY)
  const verificationPromises = topCandidates.map((section) =>
    limit(async () => {
      logger.info(`  ...verifying ${section.href}`)
      const sectionHtml = await fetchPageWithPlaywright(section.href, 'SectionVerifier')
      if (!sectionHtml) return null
      const suggestions = heuristicallyFindSelectors(sectionHtml)
      if (suggestions.length > 0) {
        return {
          url: section.href,
          title: section.text,
          headlineConfidence: suggestions[0].score.toFixed(2),
          suggestedSelector: suggestions[0].selector,
          sampleHeadlines: suggestions[0].samples.slice(0, 2),
        }
      }
      return null
    })
  )

  const verifiedSections = (await Promise.all(verificationPromises)).filter(Boolean)

  if (verifiedSections.length === 0) {
    logger.warn(
      'Could not verify any AI-suggested sections with a high confidence of headlines.'
    )
    return
  }

  logger.info(
    `\n✅ Discovery Complete. Found ${verifiedSections.length} potential new sources:\n`
  )

  verifiedSections
    .sort((a, b) => b.headlineConfidence - a.headlineConfidence)
    .forEach((section) => {
      console.log(
        `--- Section: \x1b[36m${section.title}\x1b[0m (Confidence: ${section.headlineConfidence}) ---`
      )
      console.log(`URL: \x1b[32m${section.url}\x1b[0m`)
      console.log(`Suggested Selector: \x1b[33m${section.suggestedSelector}\x1b[0m`)
      console.log(`Sample Headlines:`)
      section.sampleHeadlines.forEach((h) => console.log(`  - "${h}"`))
      console.log('\n')
    })
}

main().catch((err) => logger.error({ err }, 'Section discovery failed.'))
