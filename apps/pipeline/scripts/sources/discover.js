// apps/pipeline/scripts/sources/discover.js
/**
 * @command sources:discover
 * @group Sources
 * @description Crawl a domain to find new news sections using AI. Flags: --url <BaseURL>
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as cheerio from 'cheerio'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { fetchPageWithPlaywright } from '@headlines/scraper-logic/browser.js'
import { heuristicallyFindSelectors } from '@headlines/scraper-logic/scraper/selectorOptimizer.js'
import { sectionClassifierAgent } from '@headlines/scraper-logic/ai/index.js'
import { logger, sendErrorAlert } from '@headlines/utils-server'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import pLimit from 'p-limit'

const CONCURRENCY = 3
const MIN_ARTICLES_FOR_VERIFICATION = 3
const MAX_PAGES_TO_TEST = 3

/**
 * Enhanced selector discovery that finds headlines, links, containers, and metadata
 */
function findCompleteSelectors(html) {
  const $ = cheerio.load(html)
  const results = []

  // Find all links that look like article links
  const articleLinks = []
  $('a[href]').each((_, el) => {
    const $el = $(el)
    const href = $el.attr('href')
    const text = $el.text().trim().replace(/\s+/g, ' ')

    if (!href || href.startsWith('#') || href.startsWith('mailto:') || !text) return

    // Check if this looks like an article link (has substantial text)
    if (text.length > 20 && text.length < 300) {
      articleLinks.push({
        element: el,
        $el,
        href,
        text,
        parent: $el.parent(),
      })
    }
  })

  if (articleLinks.length < MIN_ARTICLES_FOR_VERIFICATION) {
    return []
  }

  // Group by common container patterns
  const containerMap = new Map()

  articleLinks.forEach((link) => {
    let $container = link.$el.closest(
      'article, .article, [class*="card"], [class*="item"], [class*="post"], li'
    )

    if ($container.length === 0) {
      $container = link.$el.parent()
    }

    const containerSelector = generateSelector($container, $)

    if (!containerMap.has(containerSelector)) {
      containerMap.set(containerSelector, [])
    }
    containerMap.get(containerSelector).push({ ...link, $container })
  })

  // Analyze each container pattern
  for (const [containerSelector, items] of containerMap.entries()) {
    if (items.length < MIN_ARTICLES_FOR_VERIFICATION) continue

    const firstContainer = items[0].$container

    // Find common selectors within this container type
    const headlineSelector = findBestSelectorInContainer(
      firstContainer,
      items,
      $,
      'headline'
    )
    const linkSelector = findBestSelectorInContainer(firstContainer, items, $, 'link')

    // Look for metadata patterns
    const metadataSelectors = findMetadataSelectors(firstContainer, $)

    // Extract samples
    const samples = items.slice(0, 5).map((item) => ({
      headline: item.text,
      url: item.href,
      author: extractText(item.$container, metadataSelectors.author, $),
      date: extractText(item.$container, metadataSelectors.date, $),
      description: extractText(item.$container, metadataSelectors.description, $),
      image: extractAttribute(item.$container, metadataSelectors.image, 'src', $),
    }))

    // Calculate confidence score
    const score = calculateConfidenceScore(items, samples)

    results.push({
      containerSelector,
      selectors: {
        headline: headlineSelector,
        link: linkSelector,
        ...metadataSelectors,
      },
      samples,
      score,
      articleCount: items.length,
    })
  }

  return results.sort((a, b) => b.score - a.score)
}

/**
 * Generate a CSS selector for an element
 */
function generateSelector($el, $) {
  if ($el.length === 0) return null

  const tagName = $el.prop('tagName')?.toLowerCase()
  if (!tagName) return null

  // Try ID first
  const id = $el.attr('id')
  if (id && $(tagName + '#' + id).length === 1) {
    return `${tagName}#${id}`
  }

  // Try class combinations
  const classes =
    $el
      .attr('class')
      ?.split(/\s+/)
      .filter((c) => c) || []
  if (classes.length > 0) {
    const classSelector = `${tagName}.${classes.slice(0, 2).join('.')}`
    return classSelector
  }

  return tagName
}

/**
 * Find the best selector for headlines or links within a container
 */
function findBestSelectorInContainer($container, items, $, type) {
  const selectors = new Map()

  items.forEach((item) => {
    let $target = type === 'headline' ? item.$el : item.$el

    if (type === 'headline') {
      // Try to find a more specific headline element
      const $heading = item.$el.find('h1, h2, h3, h4').first()
      if ($heading.length > 0) {
        $target = $heading
      }
    }

    const localSelector = generateLocalSelector($target, $container, $)
    if (localSelector) {
      selectors.set(localSelector, (selectors.get(localSelector) || 0) + 1)
    }
  })

  // Return the most common selector
  let bestSelector = null
  let maxCount = 0

  for (const [selector, count] of selectors.entries()) {
    if (count > maxCount) {
      maxCount = count
      bestSelector = selector
    }
  }

  return bestSelector
}

/**
 * Generate a selector relative to a container
 */
function generateLocalSelector($el, $container, $) {
  const tagName = $el.prop('tagName')?.toLowerCase()
  const classes =
    $el
      .attr('class')
      ?.split(/\s+/)
      .filter((c) => c) || []

  if (classes.length > 0) {
    return `${tagName}.${classes[0]}`
  }

  // Try finding by tag hierarchy
  const $parent = $el.parent()
  if ($parent[0] !== $container[0]) {
    const parentTag = $parent.prop('tagName')?.toLowerCase()
    return `${parentTag} ${tagName}`
  }

  return tagName
}

/**
 * Find common metadata selectors
 */
function findMetadataSelectors($container, $) {
  const selectors = {}

  // Look for author
  const $author = $container
    .find('[class*="author"], [class*="byline"], [rel="author"]')
    .first()
  if ($author.length > 0) {
    selectors.author = generateLocalSelector($author, $container, $)
  }

  // Look for date/time
  const $date = $container.find('time, [class*="date"], [class*="published"]').first()
  if ($date.length > 0) {
    selectors.date = generateLocalSelector($date, $container, $)
  }

  // Look for description/excerpt
  const $desc = $container
    .find('[class*="excerpt"], [class*="description"], [class*="summary"], p')
    .first()
  if ($desc.length > 0 && $desc.text().trim().length > 30) {
    selectors.description = generateLocalSelector($desc, $container, $)
  }

  // Look for image
  const $img = $container.find('img[src]').first()
  if ($img.length > 0) {
    selectors.image = generateLocalSelector($img, $container, $)
  }

  return selectors
}

/**
 * Extract text from a selector within a container
 */
function extractText($container, selector, $) {
  if (!selector) return null
  const $el = $container.find(selector).first()
  return $el.length > 0 ? $el.text().trim() : null
}

/**
 * Extract attribute from a selector within a container
 */
function extractAttribute($container, selector, attr, $) {
  if (!selector) return null
  const $el = $container.find(selector).first()
  return $el.length > 0 ? $el.attr(attr) : null
}

/**
 * Calculate confidence score based on pattern consistency
 */
function calculateConfidenceScore(items, samples) {
  let score = Math.min(items.length / 10, 1) * 50 // Up to 50 points for quantity

  // Check sample quality
  const validSamples = samples.filter(
    (s) => s.headline && s.url && s.headline.length > 20
  )
  score += (validSamples.length / samples.length) * 30 // Up to 30 points for quality

  // Bonus for metadata
  const hasAuthor = samples.some((s) => s.author)
  const hasDate = samples.some((s) => s.date)
  const hasDescription = samples.some((s) => s.description)
  const hasImage = samples.some((s) => s.image)

  score +=
    (hasAuthor ? 5 : 0) +
    (hasDate ? 5 : 0) +
    (hasDescription ? 5 : 0) +
    (hasImage ? 5 : 0)

  return Math.round(score)
}

/**
 * Detect if a page is behind a paywall
 */
function detectPaywall(html, url) {
  const $ = cheerio.load(html)
  const bodyText = $('body').text().toLowerCase()

  const paywallIndicators = [
    'subscribe to continue',
    'subscription required',
    'become a member',
    'paywall',
    'premium content',
    'subscribers only',
    'sign in to read',
    'register to continue',
  ]

  const hasPaywallIndicator = paywallIndicators.some((indicator) =>
    bodyText.includes(indicator)
  )

  const hasPaywallClass = $('[class*="paywall"], [id*="paywall"]').length > 0

  return hasPaywallIndicator || hasPaywallClass
}

/**
 * Test selectors across multiple pages
 */
async function verifySelectorsAcrossPages(
  baseUrl,
  selectorPattern,
  maxPages = MAX_PAGES_TO_TEST
) {
  const results = []

  for (let i = 1; i <= maxPages; i++) {
    const testUrl =
      i === 1 ? baseUrl : `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}page=${i}`

    try {
      logger.info(`    Testing page ${i}: ${testUrl}`)
      const html = await fetchPageWithPlaywright(testUrl, 'SelectorVerifier')

      if (!html) {
        logger.warn(`    Failed to fetch page ${i}`)
        break
      }

      if (detectPaywall(html, testUrl)) {
        logger.warn(`    ⚠️  Page ${i} appears to be paywalled - skipping`)
        results.push({ page: i, paywalled: true, articleCount: 0 })
        continue
      }

      const selectors = findCompleteSelectors(html)

      if (selectors.length > 0) {
        results.push({
          page: i,
          paywalled: false,
          articleCount: selectors[0].articleCount,
          score: selectors[0].score,
          samples: selectors[0].samples.slice(0, 2),
        })
      } else {
        results.push({ page: i, paywalled: false, articleCount: 0 })
      }

      // If no articles found on this page, stop testing
      if (selectors.length === 0 || selectors[0].articleCount === 0) {
        break
      }
    } catch (error) {
      logger.error(`    Error testing page ${i}: ${error.message}`)
      break
    }
  }

  return results
}

/**
 * Generate a source configuration file
 */
function generateSourceConfig(baseUrl, section, multiPageResults) {
  const urlObj = new URL(baseUrl)
  const domain = urlObj.hostname.replace('www.', '')
  const sourceName = domain.split('.')[0]

  const avgScore =
    multiPageResults.reduce((sum, r) => sum + (r.score || 0), 0) / multiPageResults.length
  const totalArticles = multiPageResults.reduce((sum, r) => sum + r.articleCount, 0)
  const hasPaywall = multiPageResults.some((r) => r.paywalled)

  return {
    name: `${sourceName}_${section.title.toLowerCase().replace(/\s+/g, '_')}`,
    displayName: `${sourceName.charAt(0).toUpperCase() + sourceName.slice(1)} - ${section.title}`,
    url: section.url,
    enabled: avgScore > 70 && !hasPaywall,
    paywallDetected: hasPaywall,
    selectors: {
      container: section.selectors.containerSelector,
      headline: section.selectors.headline,
      link: section.selectors.link,
      author: section.selectors.author || null,
      date: section.selectors.date || null,
      description: section.selectors.description || null,
      image: section.selectors.image || null,
    },
    pagination: {
      type: 'query_param', // Most common pattern
      param: 'page',
      // Can be enhanced with actual pagination detection
    },
    confidence: {
      score: Math.round(avgScore),
      articlesFound: totalArticles,
      pagesVerified: multiPageResults.filter((r) => !r.paywalled).length,
    },
    samples: section.samples.slice(0, 3),
    discoveredAt: new Date().toISOString(),
  }
}

async function main() {
  try {
    await initializeScriptEnv()
    const argv = yargs(hideBin(process.argv))
      .usage('Usage: $0 --url <URL> [--output <path>]')
      .option('url', {
        alias: 'u',
        type: 'string',
        description: 'The base URL of the news site to discover sections from.',
        demandOption: true,
      })
      .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output directory for generated config files',
        default: './discovered-sources',
      }).argv

    const baseUrl = argv.url
    const outputDir = argv.output
    const baseUrlObj = new URL(baseUrl)
    logger.info(`🔎 Discovering news sections for: ${baseUrl} (AI-Powered)`)

    const html = await fetchPageWithPlaywright(baseUrl, 'SectionDiscoverer')
    if (!html) {
      throw new Error('Failed to fetch base page content.')
    }

    // Check if the main page is paywalled
    if (detectPaywall(html, baseUrl)) {
      logger.error(
        '❌ Base URL appears to be behind a paywall. Cannot proceed with discovery.'
      )
      logger.info('💡 Tip: This tool works best with publicly accessible news sections.')
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
    logger.info(
      `Found ${uniqueLinks.length} unique internal links. Classifying with AI...`
    )

    const classifications = await sectionClassifierAgent(uniqueLinks)
    if (!classifications) {
      throw new Error('AI link classification failed.')
    }

    const topCandidates = uniqueLinks
      .map((link, i) => ({ ...link, classification: classifications[i].classification }))
      .filter((link) => link.classification === 'news_section')

    if (topCandidates.length === 0) {
      logger.warn('AI analysis did not identify any promising "news_section" links.')
      return
    }

    logger.info(
      `AI identified ${topCandidates.length} promising sections. Verifying with enhanced selector discovery...`
    )

    const limit = pLimit(CONCURRENCY)
    const verificationPromises = topCandidates.map((section) =>
      limit(async () => {
        logger.info(`\n  📄 Analyzing ${section.href}`)
        const sectionHtml = await fetchPageWithPlaywright(section.href, 'SectionVerifier')
        if (!sectionHtml) return null

        if (detectPaywall(sectionHtml, section.href)) {
          logger.warn(`  ⚠️  Section appears to be paywalled - skipping`)
          return null
        }

        const selectorPatterns = findCompleteSelectors(sectionHtml)

        if (selectorPatterns.length === 0) {
          logger.warn(`  ❌ No article patterns found`)
          return null
        }

        const bestPattern = selectorPatterns[0]
        logger.info(
          `  ✓ Found pattern with ${bestPattern.articleCount} articles (score: ${bestPattern.score})`
        )

        // Verify across multiple pages
        logger.info(`  🔍 Verifying across multiple pages...`)
        const multiPageResults = await verifySelectorsAcrossPages(
          section.href,
          bestPattern
        )

        const validPages = multiPageResults.filter(
          (r) => !r.paywalled && r.articleCount > 0
        )

        if (validPages.length === 0) {
          logger.warn(`  ❌ Could not verify pattern on any page`)
          return null
        }

        logger.info(`  ✅ Verified on ${validPages.length} page(s)`)

        return {
          title: section.text,
          url: section.href,
          selectors: {
            containerSelector: bestPattern.containerSelector,
            ...bestPattern.selectors,
          },
          samples: bestPattern.samples,
          multiPageResults,
        }
      })
    )

    const verifiedSections = (await Promise.all(verificationPromises)).filter(Boolean)

    if (verifiedSections.length === 0) {
      logger.warn('❌ Could not verify any AI-suggested sections with high confidence.')
      logger.info(
        '💡 This might indicate paywalled content or complex JavaScript-heavy pages.'
      )
      return
    }

    logger.info(
      `\n✅ Discovery Complete. Found ${verifiedSections.length} verified sources!\n`
    )

    // Generate and save config files
    const configs = []

    for (const section of verifiedSections) {
      const config = generateSourceConfig(baseUrl, section, section.multiPageResults)
      configs.push(config)

      // Display results
      const avgScore =
        section.multiPageResults.reduce((s, r) => s + (r.score || 0), 0) /
        section.multiPageResults.length
      const statusIcon = config.paywallDetected ? '⚠️' : avgScore > 80 ? '🌟' : '✓'

      console.log(
        `\n${statusIcon} Section: \x1b[36m${section.title}\x1b[0m (Confidence: ${Math.round(avgScore)})`
      )
      console.log(`   URL: \x1b[32m${section.url}\x1b[0m`)
      console.log(`   Container: \x1b[33m${section.selectors.containerSelector}\x1b[0m`)
      console.log(`   Headline: \x1b[33m${section.selectors.headline}\x1b[0m`)
      console.log(`   Link: \x1b[33m${section.selectors.link}\x1b[0m`)

      if (section.selectors.author)
        console.log(`   Author: \x1b[33m${section.selectors.author}\x1b[0m`)
      if (section.selectors.date)
        console.log(`   Date: \x1b[33m${section.selectors.date}\x1b[0m`)
      if (section.selectors.description)
        console.log(`   Description: \x1b[33m${section.selectors.description}\x1b[0m`)
      if (section.selectors.image)
        console.log(`   Image: \x1b[33m${section.selectors.image}\x1b[0m`)

      if (config.paywallDetected) {
        console.log(`   \x1b[31m⚠️  Paywall detected on some pages\x1b[0m`)
      }

      console.log(`   Sample headlines:`)
      section.samples.slice(0, 2).forEach((s) => {
        console.log(`     - "${s.headline}"`)
        if (s.author) console.log(`       Author: ${s.author}`)
        if (s.date) console.log(`       Date: ${s.date}`)
      })
    }

    // Save configs to files
    try {
      await writeFile(
        join(outputDir, `discovered-${Date.now()}.json`),
        JSON.stringify(configs, null, 2)
      )
      logger.info(
        `\n💾 Configuration saved to: ${outputDir}/discovered-${Date.now()}.json`
      )
      logger.info(`\n📝 Next steps:`)
      logger.info(`   1. Review the generated configuration file`)
      logger.info(`   2. Test the selectors manually on the source pages`)
      logger.info(`   3. Import into your scraper configuration`)
      logger.info(`   4. Monitor for changes over time`)
    } catch (err) {
      logger.warn(`Could not save config file: ${err.message}`)
      logger.info(`Config data:\n${JSON.stringify(configs, null, 2)}`)
    }
  } catch (error) {
    sendErrorAlert(error, { origin: 'DISCOVER_SOURCES_SCRIPT' })
    logger.fatal({ err: error }, 'Section discovery script failed.')
  }
}

main()
