// apps/pipeline/scripts/watchlist/list.js
/**
 * @command watchlist:list
 * @group Watchlist
 * @description List watchlist entities. Flags: --q <SearchQuery>
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { findWatchlistEntities } from '@headlines/data-access'
import colors from 'ansi-colors'

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('q', { type: 'string', description: 'Search query for entity name' })
    .help().argv

  await initializeScriptEnv()
  try {
    const filter = {}
    if (argv.q) {
      filter.name = new RegExp(argv.q, 'i')
    }

    const entitiesResult = await findWatchlistEntities(filter)
    if (!entitiesResult.success) throw new Error(entitiesResult.error)
    const entities = entitiesResult.data

    if (entities.length === 0) {
      console.log('No watchlist entities found.')
      return
    }

    const tableData = entities.map((e) => ({
      Name: e.name,
      Type: e.type,
      Status: e.status === 'active' ? colors.green('Active') : colors.yellow(e.status),
      Country: e.country || 'N/A',
      'Search Terms': (e.searchTerms || []).join(', '),
    }))
    console.log(`\n--- Watchlist Entities (${entities.length}) ---`)
    console.table(tableData)
  } catch (error) {
    console.error('An error occurred:', error.message)
  }
}
main()
