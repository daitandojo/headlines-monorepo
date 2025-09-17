// apps/pipeline/scripts/watchlist/list.js (version 1.0)
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import mongoose from 'mongoose'
import { WatchlistEntity } from '../../../../packages/models/src/index.js'
import dbConnect from '../../../../packages/data-access/src/dbConnect.js'
import colors from 'ansi-colors'

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('q', { type: 'string', description: 'Search query for entity name' })
    .help().argv

  await dbConnect()
  try {
    const query = {}
    if (argv.q) {
      query.name = new RegExp(argv.q, 'i')
    }

    const entities = await WatchlistEntity.find(query).sort({ name: 1 }).lean()

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
  } finally {
    await mongoose.disconnect()
  }
}
main()
