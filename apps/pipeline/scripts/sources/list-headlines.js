// apps/pipeline/scripts/sources/list-headlines.js
/**
 * @command sources:list-headlines
 * @group Sources
 * @description Scrapes and lists the latest headlines for a single source. Usage: --source <SourceName>
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { getAllSources } from '@headlines/data-access'
import { scrapeSiteForHeadlines } from '@headlines/scraper-logic/scraper/index.js'
import { browserManager } from '@headlines/scraper-logic/browserManager.js'

async function listHeadlinesForSource() {
  const argv = yargs(hideBin(process.argv))
    .option('source', {
      alias: 's',
      type: 'string',
      description: 'The name of the source to scrape.',
      demandOption: true,
    })
    .help().argv

  try {
    await initializeScriptEnv()
    await browserManager.initialize()
    logger.info(`🚀 Scraping headlines for source: "${argv.source}"`)

    const sourcesResult = await getAllSources({
      filter: { name: new RegExp(`^${argv.source}$`, 'i') },
    })
    if (!sourcesResult.success || sourcesResult.data.length === 0) {
      throw new Error(`Source "${argv.source}" not found.`)
    }
    const source = sourcesResult.data[0]

    const result = await scrapeSiteForHeadlines(source)

    if (!result.success || result.resultCount === 0) {
      logger.error(
        `❌ Headline scraping failed. Reason: ${result.error || 'No headlines found.'}`
      )
      return
    }

    logger.info(
      `✅ Found ${result.resultCount} headlines from ${source.name}. Displaying first 15:`
    )

    const tableData = result.articles.slice(0, 15).map((article) => ({
      Headline:
        article.headline.substring(0, 100) + (article.headline.length > 100 ? '...' : ''),
      Link: article.link,
    }))

    console.table(tableData)
  } catch (error) {
    logger.fatal({ err: error }, 'A critical error occurred during the script.')
  } finally {
    await browserManager.close()
  }
}

listHeadlinesForSource()
