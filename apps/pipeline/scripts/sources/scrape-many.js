// apps/pipeline/scripts/sources/scrape-many.js
/**
 * @command sources:scrape-many
 * @group Sources
 * @description Scrape multiple sources, optionally filtered by country. Flags: --country <CountryName>
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import pLimit from 'p-limit'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { getAllSources } from '@headlines/data-access'
import {
  scrapeSiteForHeadlines,
  scrapeArticleContent,
} from '@headlines/scraper-logic/scraper/index.js'

const CONCURRENCY = 5

async function testSource(source) {
  logger.info(`\n▶️  Testing: ${source.name} (${source.country})`)
  const headlineResult = await scrapeSiteForHeadlines(source)

  if (!headlineResult.success || headlineResult.resultCount === 0) {
    logger.error(
      `❌ Headline scraping failed. Reason: ${headlineResult.error || 'No headlines found.'}`
    )
    return
  }

  logger.info(`✅ Found ${headlineResult.resultCount} headlines.`)
  const firstArticle = headlineResult.articles[0]

  const contentResult = await scrapeArticleContent(
    {
      ...firstArticle,
      source: source.name,
      newspaper: source.name,
      country: source.country,
    },
    source
  )

  if (contentResult.articleContent && contentResult.articleContent.contents.length > 0) {
    logger.info(
      `✅ Content scraping successful (${
        contentResult.articleContent.contents.join('').length
      } chars).`
    )
  } else {
    logger.error(`❌ Content scraping failed. Reason: ${contentResult.enrichment_error}`)
  }
}

async function scrapeMany() {
  const argv = yargs(hideBin(process.argv))
    .option('country', {
      alias: 'c',
      type: 'string',
      description: 'The country to scrape sources from.',
    })
    .option('include-inactive', {
      alias: 'i',
      type: 'boolean',
      description: 'Include sources marked as "paused" or "under_review".',
      default: false,
    })
    .help()
    .alias('help', 'h').argv

  try {
    await initializeScriptEnv()

    const filter = {}
    if (argv.country) {
      filter.country = new RegExp(`^${argv.country}$`, 'i')
      logger.info(`Filtering for country: "${argv.country}"`)
    }
    if (!argv.includeInactive) {
      filter.status = 'active'
      logger.info('Including only "active" sources. Use --include-inactive to override.')
    }

    const sourcesResult = await getAllSources({ filter })
    if (!sourcesResult.success) throw new Error(sourcesResult.error)
    const sources = sourcesResult.data

    if (sources.length === 0) {
      logger.warn('No sources found matching the criteria.')
      return
    }

    logger.info(
      `🚀 Found ${sources.length} source(s) to test. Starting with concurrency ${CONCURRENCY}...`
    )
    const limit = pLimit(CONCURRENCY)
    const promises = sources.map((source) => limit(() => testSource(source)))

    await Promise.all(promises)
    logger.info('\n✅ All scrape tests completed.')
  } catch (error) {
    logger.fatal(
      { err: error },
      'A critical error occurred during the scrape-many script.'
    )
  }
}

scrapeMany()
