// apps/pipeline/scripts/tools/oppFactory.js (v2 - Resilient Search Strategy)
/**
 * @command tools:opp-factory
 * @group Tools
 * @description Creates a rich opportunity dossier for a given individual by searching and scraping the web, then generating a seed file.
 * @example pnpm run tools:opp-factory -- --name "Ole Branaas"
 */
import { writeFileSync } from 'fs'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { performGoogleSearch, oppFactoryChain } from '@headlines/ai-services'
import { fetchPageWithPlaywright, browserManager } from '@headlines/scraper-logic'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import colors from 'ansi-colors'
// --- START OF DEFINITIVE FIX ---
// Add the missing import for chromium from the playwright package.
import { chromium } from 'playwright'
// --- END OF DEFINITIVE FIX ---

const SEED_DIR = path.resolve(process.cwd(), 'apps/pipeline/opportunity_seeds')

async function fetchLinks(name) {
  logger.info(`[Step 1/4] 🔍 Performing Google Search for "${name}"...`)

  let results = []

  const specificQuery = `"${name}" billionaire OR founder OR investor family office net worth contact email site:no OR site:se`
  logger.info(`  -> Trying specific query: ${specificQuery}`)
  let searchResult = await performGoogleSearch(specificQuery, { numResults: 10 })

  if (searchResult.success && searchResult.results.length > 0) {
    results = searchResult.results
  } else {
    logger.warn(`  -> Specific query yielded no results. Broadening search...`)

    const broadRegionalQuery = `"${name}" site:no OR site:se`
    logger.info(`  -> Trying broad regional query: ${broadRegionalQuery}`)
    searchResult = await performGoogleSearch(broadRegionalQuery, { numResults: 10 })
    if (searchResult.success && searchResult.results.length > 0) {
      results = searchResult.results
    } else {
      logger.warn(`  -> Broad regional query also failed. Searching globally...`)

      const globalQuery = `"${name}" business`
      logger.info(`  -> Trying global query: ${globalQuery}`)
      searchResult = await performGoogleSearch(globalQuery, { numResults: 10 })
      if (searchResult.success && searchResult.results.length > 0) {
        results = searchResult.results
      }
    }
  }

  if (results.length === 0) {
    throw new Error('All search strategies failed to return any organic results.')
  }

  const links = results.map((r) => r.link)
  logger.info(`  -> Found ${links.length} relevant links to process.`)
  return links
}

async function scrapePages(urls) {
  logger.info(`[Step 2/4]  Scraping ${urls.length} pages for full text content...`)
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; HeadlinesOppBot/1.0)',
  })
  const texts = []

  for (const url of urls) {
    try {
      const p = await ctx.newPage()
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 })
      const html = await p.content()
      const doc = new JSDOM(html, { url })
      const reader = new Readability(doc.window.document)
      const art = reader.parse()
      if (art && art.textContent.length > 200) {
        texts.push({ url, text: art.textContent.replace(/\s+/g, ' ').trim() })
        logger.info(`  -> Successfully scraped ${url} (${art.length} chars)`)
      } else {
        logger.warn(`  -> Skipped ${url} (content too short or unreadable)`)
      }
      await p.close()
    } catch (e) {
      logger.warn(`  -> Failed to scrape ${url}: ${e.message}`)
    }
  }
  await browser.close()
  logger.info(`  -> Successfully extracted readable text from ${texts.length} pages.`)
  return texts
}

async function buildOpportunity(name, articles) {
  logger.info(`[Step 3/4] 🤖 Synthesizing dossier for "${name}"...`)
  const articles_text = articles
    .map((a, i) => `### Article ${i + 1} (${a.url})\n${a.text.slice(0, 12000)}`)
    .join('\n\n---\n\n')

  const result = await oppFactoryChain({ name, articles_text })

  if (result.error || !result.opportunities || result.opportunities.length === 0) {
    throw new Error(
      `AI Dossier Agent failed. Reason: ${result.error || 'No opportunity object returned'}`
    )
  }

  const opp = result.opportunities[0]

  delete opp.events
  delete opp.relatedOpportunities

  logger.info(`  -> AI synthesis complete.`)
  return opp
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('name', {
      alias: 'n',
      type: 'string',
      description: 'The full name of the individual to research.',
      demandOption: true,
    })
    .help().argv

  await initializeScriptEnv()
  await browserManager.initialize()

  const NAME = argv.name.trim()
  logger.info(colors.bold.cyan(`\n🏭 Starting Opportunity Factory for: ${NAME}\n`))

  const links = await fetchLinks(NAME)
  if (links.length === 0) {
    logger.error('Could not find any links to process. Exiting.')
    await browserManager.close()
    return
  }

  const texts = await scrapePages(links)
  if (texts.length === 0) {
    logger.error('Failed to scrape any readable content from the found links. Exiting.')
    await browserManager.close()
    return
  }

  const opp = await buildOpportunity(NAME, texts)

  logger.info('[Step 4/4] 📄 Generating output file...')

  const fileNameSafe = NAME.toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
  const fileName = `${fileNameSafe}.js`
  const filePath = path.join(SEED_DIR, fileName)
  const varName = NAME.replace(/\s+/g, '').replace(/[^A-Za-z0-9]/g, '')

  const fileContent = `// Generated by OppFactory.js at ${new Date().toISOString()}\nconst ${varName}Opportunity = ${JSON.stringify(opp, null, 2)};\n\nexport default ${varName}Opportunity;\n`

  writeFileSync(filePath, fileContent)

  logger.info(colors.green.bold(`\n✅ Success! Dossier seed file saved to: ${filePath}`))
  console.log(colors.grey('\n--- Generated File Content ---'))
  console.log(colors.grey(fileContent))
  console.log(colors.grey('--------------------------'))
}

main()
  .catch((err) => {
    logger.fatal({ err }, 'Opportunity Factory script failed with a critical error.')
  })
  .finally(async () => {
    await browserManager.close()
    process.exit(0)
  })
