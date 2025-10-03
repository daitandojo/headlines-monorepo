// apps/pipeline/scripts/sources/list-sources.js
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { getAllSources } from '@headlines/data-access'
import colors from 'ansi-colors'

async function listSources() {
  const argv = yargs(hideBin(process.argv))
    .option('country', { alias: 'c', type: 'string' })
    .option('status', { alias: 's', type: 'string', choices: ['failing', 'healthy'] })
    .option('json', { type: 'boolean', description: 'Output as JSON' })
    .help().argv

  await initializeScriptEnv()
  try {
    const filter = {}
    if (argv.country) filter.country = new RegExp(`^${argv.country}$`, 'i')
    if (argv.status === 'failing') {
      filter['analytics.lastRunHeadlineCount'] = 0
      filter['analytics.totalRuns'] = { $gt: 0 }
    } else if (argv.status === 'healthy') {
      filter['analytics.lastRunHeadlineCount'] = { $gt: 0 }
    }

    const sourcesResult = await getAllSources({ filter })
    if (!sourcesResult.success) throw new Error(sourcesResult.error)
    const sources = sourcesResult.data

    if (argv.json) {
      console.log(JSON.stringify(sources, null, 2))
      return
    }

    if (sources.length === 0) {
      console.log('No sources found matching criteria.')
      return
    }

    const tableData = sources.map((s) => {
      const analytics = s.analytics || {}
      let health = colors.yellow('❓ New')
      if (analytics.totalRuns > 0) {
        health =
          analytics.lastRunHeadlineCount > 0
            ? colors.green('✅ Healthy')
            : colors.red('❌ Failing')
      }
      return {
        Name: s.name,
        Health: health,
        'Last Count': analytics.lastRunHeadlineCount ?? 'N/A',
        Country: s.country,
        Method: s.extractionMethod,
      }
    })
    console.table(tableData)
  } catch (error) {
    console.error('An error occurred:', error.message)
  }
}
listSources()
