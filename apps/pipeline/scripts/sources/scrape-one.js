'use server'

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import mongoose from 'mongoose'
import { initializeScriptEnv } from '../seed/lib/script-init.js' // The centralized initializer
import { logger } from '@headlines/utils-server/node'
import { truncateString } from '@headlines/utils-shared'
import { Source } from '@headlines/models'
import {
  scrapeSiteForHeadlines,
  scrapeArticleContent,
} from '@headlines/scraper-logic/scraper/index.js'

async function scrapeOne() {
  const argv = yargs(hideBin(process.argv))
    .option('source', {
      alias: 's',
      type: 'string',
      description: 'The name of the source to scrape.',
      demandOption: true,
    })
    .help()
    .alias('help', 'h').argv

  const sourceName = argv.source

  try {
    // The initializeScriptEnv function handles db connection, config loading, and logger setup.
    await initializeScriptEnv()

    logger.info(`🚀 Starting single source scrape for: "${sourceName}"`)

    const source = await Source.findOne({
      name: new RegExp(`^${sourceName}$`, 'i'),
    }).lean()
    if (!source) {
      logger.error(`❌ Source "${sourceName}" not found in the database.`)
      return
    }

    logger.info('🔬 Source Configuration:\n' + JSON.stringify(source, null, 2))

    logger.info('\n▶️  Phase 1: Scraping Headlines...')
    const headlineResult = await scrapeSiteForHeadlines(source)

    if (!headlineResult.success || headlineResult.resultCount === 0) {
      logger.error(
        `❌ Headline scraping failed. Reason: ${
          headlineResult.error || 'No headlines found.'
        }`
      )
      return
    }

    logger.info(`✅ Found ${headlineResult.resultCount} headlines.`)
    const firstArticle = headlineResult.articles[0]
    logger.info(
      `    - First Headline: "${firstArticle.headline}"\n    - Link: ${firstArticle.link}`
    )

    logger.info('\n▶️  Phase 2: Scraping Content for First Article...')
    const contentResult = await scrapeArticleContent(
      {
        ...firstArticle,
        source: source.name,
        newspaper: source.name,
        country: source.country,
      },
      source
    )

    if (
      contentResult.articleContent &&
      contentResult.articleContent.contents.length > 0
    ) {
      const content = contentResult.articleContent.contents.join('\n')
      logger.info(`✅ Content scraping successful! (${content.length} chars)`)
      logger.info(`    - Snippet: "${truncateString(content, 300)}..."`)
    } else {
      logger.error(
        `❌ Content scraping failed. Reason: ${contentResult.enrichment_error}`
      )
      if (contentResult.contentPreview) {
        logger.warn(`    - Scraped Preview: "${contentResult.contentPreview}..."`)
      }
    }
  } catch (error) {
    logger.fatal(
      { err: error },
      'A critical error occurred during the scrape-one script.'
    )
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
      logger.info('Database connection closed.')
    }
  }
}

scrapeOne()
