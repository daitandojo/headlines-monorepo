// apps/pipeline/src/app.js
// import { env } from '@headlines/config'
import { reinitializeLogger } from '@headlines/utils-server'
import { initializeAuditLogger } from './utils/auditLogger.js'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { runPipeline } from './orchestrator.js'
// DEFINITIVE FIX: The 'humanLogStream' import is no longer needed and is removed.
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '../../..')

const logDirectory = path.join(PROJECT_ROOT, 'apps/pipeline/logs')
if (!fs.existsSync(logDirectory)) fs.mkdirSync(logDirectory, { recursive: true })

// DEFINITIVE FIX: The logger initialization is simplified.
// reinitializeLogger now handles both console and file logging internally.
const logger = reinitializeLogger(logDirectory)
initializeAuditLogger(logDirectory)

async function start() {
  const argv = yargs(hideBin(process.argv))
    .option('source', {
      alias: 's',
      type: 'string',
      description: 'Run the pipeline for a single source by name.',
    })
    .option('country', {
      alias: 'c',
      type: 'string',
      description: 'Run the pipeline for all sources in a specific country.',
    })
    .option('deleteToday', {
      type: 'boolean',
      description: 'Delete all documents created today before running.',
    })
    .option('useTestPayload', {
      type: 'boolean',
      description: 'Use a predefined test payload instead of scraping.',
    })
    .help().argv

  const options = {
    ...argv,
    countryFilter: argv.country,
    sourceFilter: argv.source,
    projectRoot: PROJECT_ROOT,
  }

  logger.info('--- Pipeline Execution Flags ---')
  Object.entries(argv).forEach(([key, value]) => {
    if (key !== '_' && key !== '$0' && value) {
      logger.info(`- ${key.toUpperCase()}: ${value}`)
    }
  })
  logger.info('------------------------------------')

  let result
  try {
    result = await runPipeline(options)
  } catch (error) {
    logger.fatal({ err: error }, 'A top-level, unhandled exception occurred.')
    process.exit(1)
  }

  if (result && !result.success) {
    logger.warn(
      'Pipeline completed with one or more fatal errors. Exiting with status 1.'
    )
    process.exit(1)
  } else {
    logger.info('Pipeline completed successfully. Exiting with status 0.')
    process.exit(0)
  }
}
start()
