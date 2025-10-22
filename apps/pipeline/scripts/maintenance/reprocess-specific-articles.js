/**
 * @command maintenance:reprocess-specific
 * @group Maintenance
 * @description Reprocesses a specific list of article URLs that were missed or failed in a previous run.
 * @example pnpm run maintenance:reprocess-specific -- --urls "http://..." --headlines "corresponding headline..."
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import mongoose from 'mongoose'
import colors from 'ansi-colors'
import * as cheerio from 'cheerio'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { getAllSources } from '@headlines/data-access'
import { browserManager } from '@headlines/scraper-logic/browserManager.js'
import { fetchPageWithPlaywright } from '@headlines/scraper-logic/browser.js'
import { runAssessAndEnrich } from '../../src/pipeline/3_assessAndEnrich.js'
import { runClusterAndSynthesize } from '../../src/pipeline/4_clusterAndSynthesize.js'
import { runCommitAndNotify } from '../../src/pipeline/5_commitAndNotify.js'
import { RunStatsManager } from '../../src/utils/runStatsManager.js'
import { ArticleTraceLogger } from '../../src/utils/articleTraceLogger.js'

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('urls', {
      type: 'array',
      description: 'A space-separated list of article URLs to reprocess.',
    })
    .option('headlines', {
      type: 'string',
      description: 'A corresponding, quote-enclosed headline for each URL.',
    }) // Changed to string
    .check((argv) => {
      // Re-parsing headlines argument to handle spaces
      if (argv.headlines && typeof argv.headlines === 'string') {
        argv.headlines = [argv.headlines]
      }
      if (argv.urls && argv.headlines && argv.urls.length !== argv.headlines.length) {
        throw new Error(
          'The number of --urls must match the number of --headlines provided. Enclose headlines in quotes.'
        )
      }
      return true
    })
    .help().argv

  if (!argv.urls || !argv.headlines) {
    logger.error('Both --urls and --headlines arguments are required.')
    return
  }

  await initializeScriptEnv()
  logger.info(`🚀 Starting targeted reprocessing for ${argv.urls.length} article(s)...`)

  try {
    await browserManager.initialize()

    const sourcesResult = await getAllSources({})
    if (!sourcesResult.success) throw new Error(sourcesResult.error)
    const allSources = sourcesResult.data // DEFINITIVE FIX: Use a different variable name to avoid shadowing.

    const sourceMap = new Map(
      allSources.map((s) => [new URL(s.baseUrl).hostname.replace('www.', ''), s])
    )

    const articlesToReprocess = []
    for (let i = 0; i < argv.urls.length; i++) {
      const url = argv.urls[i]
      const originalHeadline = argv.headlines[i]
      const urlHostname = new URL(url).hostname.replace('www.', '')
      let source = sourceMap.get(urlHostname)

      if (!source) {
        const domainParts = urlHostname.split('.')
        while (domainParts.length > 1) {
          const parentDomain = domainParts.join('.')
          if (sourceMap.has(parentDomain)) {
            source = sourceMap.get(parentDomain)
            break
          }
          domainParts.shift()
        }
      }

      if (!source) {
        logger.error({ url }, `Could not find a matching source for this URL. Skipping.`)
        continue
      }
      logger.info({ url, sourceName: source.name }, 'Successfully matched URL to source.')

      logger.info({ url }, 'Fetching page to check status...')
      const html = await fetchPageWithPlaywright(url, 'Reprocess-Headline-Fetcher')
      const $ = cheerio.load(html || '')
      const pageTitle = $('title').text().toLowerCase()

      if (
        !html ||
        pageTitle.includes('not found') ||
        pageTitle.includes('finner ikke siden')
      ) {
        logger.warn(
          { url },
          'URL returned a 404 or failed to load. Injecting original headline for salvage operation.'
        )
        articlesToReprocess.push({
          _id: new mongoose.Types.ObjectId(),
          headline: originalHeadline,
          link: url,
          source: source.name,
          newspaper: source.name,
          country: source.country,
          relevance_headline: 100,
          assessment_headline: 'Manual reprocessing trigger for stale URL.',
          status: 'scraped',
          articleContent: { contents: [] },
        })
      } else {
        const realHeadline = $('h1').first().text().trim() || $('title').text().trim()
        articlesToReprocess.push({
          _id: new mongoose.Types.ObjectId(),
          headline: realHeadline,
          link: url,
          source: source.name,
          newspaper: source.name,
          country: source.country,
          relevance_headline: 100,
          assessment_headline: 'Manual reprocessing trigger.',
          status: 'scraped',
        })
      }
    }

    if (articlesToReprocess.length === 0) {
      logger.warn('No valid articles could be prepared for reprocessing. Exiting.')
      return
    }

    const runStatsManager = new RunStatsManager()
    const articleTraceLogger = new ArticleTraceLogger()
    await articleTraceLogger.initialize()

    let pipelinePayload = {
      articlesForPipeline: articlesToReprocess,
      runStatsManager,
      articleTraceLogger,
      dbConnection: true,
      noCommitMode: false,
    }

    logger.info(colors.cyan('\n--- REPROCESSING STAGE 3: ASSESS & ENRICH ---'))
    pipelinePayload = (await runAssessAndEnrich(pipelinePayload)).payload

    if (pipelinePayload.enrichedArticles && pipelinePayload.enrichedArticles.length > 0) {
      logger.info(colors.cyan('\n--- REPROCESSING STAGE 4: CLUSTER & SYNTHESIZE ---'))
      pipelinePayload = (await runClusterAndSynthesize(pipelinePayload)).payload
    } else {
      logger.warn('No articles survived the enrichment stage. Halting.')
    }

    if (
      pipelinePayload.synthesizedEvents &&
      pipelinePayload.synthesizedEvents.length > 0
    ) {
      logger.info(colors.cyan('\n--- REPROCESSING STAGE 5: COMMIT & NOTIFY ---'))
      pipelinePayload = (await runCommitAndNotify(pipelinePayload)).payload
    } else {
      logger.info('No events were synthesized from the reprocessed articles.')
    }

    logger.info(colors.green('\n✅ Reprocessing complete! Check the final report.'))
    const finalStats = runStatsManager.getStats()
    logger.info(`  - Events Created: ${finalStats.eventsSynthesized}`)
    logger.info(
      `  - Opportunities Created: ${(pipelinePayload.savedOpportunities || []).length}`
    )
    logger.info(`  - Notifications Sent: ${finalStats.eventsEmailed}`)
  } catch (error) {
    logger.fatal({ err: error }, 'A critical error occurred during reprocessing.')
  } finally {
    await browserManager.close()
  }
}

main()
