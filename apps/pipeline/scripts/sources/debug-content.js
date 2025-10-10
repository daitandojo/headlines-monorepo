// apps/pipeline/scripts/sources/debug-content.js
/**
 * @command sources:debug-content
 * @group Sources
 * @description Scrapes the first article from a source and shows extracted text for each selector. Usage: --source <SourceName>
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { getAllSources } from '@headlines/data-access'
import { scrapeSiteForHeadlines } from '@headlines/scraper-logic/scraper/index.js'
import { fetchPageWithPlaywright } from '@headlines/scraper-logic/browser.js'
import { browserManager } from '@headlines/scraper-logic/browserManager.js'
import * as cheerio from 'cheerio'
import colors from 'ansi-colors'

async function debugContentSelectors() {
  const argv = yargs(hideBin(process.argv))
    .option('source', {
      alias: 's',
      type: 'string',
      description: 'The name of the source to debug.',
      demandOption: true,
    })
    .help().argv

  try {
    await initializeScriptEnv()
    await browserManager.initialize()
    logger.info(`🚀 Debugging content selectors for source: "${argv.source}"`)

    const sourcesResult = await getAllSources({
      filter: { name: new RegExp(`^${argv.source}$`, 'i') },
    })
    if (!sourcesResult.success || sourcesResult.data.length === 0) {
      throw new Error(`Source "${argv.source}" not found.`)
    }
    const source = sourcesResult.data[0]

    logger.info('Step 1: Finding a recent article URL...')
    const headlineResult = await scrapeSiteForHeadlines(source)
    if (!headlineResult.success || headlineResult.resultCount === 0) {
      throw new Error(
        `Could not find any headlines for source "${source.name}" to test content scraping.`
      )
    }
    const targetArticle = headlineResult.articles[0]
    logger.info(`Found article to test: "${targetArticle.headline}"`)
    logger.info(`URL: ${targetArticle.link}`)

    logger.info('\nStep 2: Fetching full article page HTML...')
    const html = await fetchPageWithPlaywright(targetArticle.link, 'ContentDebugger')
    if (!html) {
      throw new Error('Failed to fetch article HTML with Playwright.')
    }
    logger.info(`Successfully fetched ${html.length} bytes of HTML.`)

    const $ = cheerio.load(html)
    const selectors = Array.isArray(source.articleSelector)
      ? source.articleSelector
      : [source.articleSelector].filter(Boolean)

    if (selectors.length === 0) {
      logger.warn('This source has no `articleSelector` defined. Nothing to debug.')
      return
    }

    console.log(colors.bold.cyan('\n--- Step 3: Testing Each Selector Individually ---'))
    let combinedContent = []

    selectors.forEach((selector, index) => {
      console.log(
        `\nTesting selector ${index + 1}/${selectors.length}: ${colors.yellow(selector)}`
      )
      const elements = $(selector)
      if (elements.length === 0) {
        console.log(colors.red('  -> Found 0 matching elements.'))
      } else {
        console.log(colors.green(`  -> Found ${elements.length} matching element(s).`))
        elements.each((_, el) => {
          const text = $(el).text().trim().replace(/\s+/g, ' ')
          if (text) {
            combinedContent.push(text)
            console.log(colors.gray(`    - Snippet: "${text.substring(0, 150)}..."`))
          }
        })
      }
    })

    const finalText = [...new Set(combinedContent)].join('\n\n')

    console.log(colors.bold.cyan('\n--- Final Combined & Cleaned Content ---'))
    console.log(`Total Length: ${finalText.length} characters`)
    console.log('------------------------------------------')
    console.log(finalText.substring(0, 2000) + (finalText.length > 2000 ? '\n...' : ''))
    console.log('------------------------------------------')
  } catch (error) {
    logger.fatal({ err: error }, 'A critical error occurred during the script.')
  } finally {
    await browserManager.close()
  }
}

debugContentSelectors()
