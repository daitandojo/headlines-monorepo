// apps/pipeline/src/app.js
process.env.IS_PIPELINE_RUN = 'true'

import { env } from '@headlines/config/src/server.js'
import { reinitializeLogger } from '@headlines/utils/src/server.js'
import { initializeAuditLogger } from './utils/auditLogger.js'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { runPipeline } from './orchestrator.js'
import humanLogStream from './utils/humanLogStream.js'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '../../..')

const logDirectory = path.join(PROJECT_ROOT, 'apps/pipeline/logs')
if (!fs.existsSync(logDirectory)) fs.mkdirSync(logDirectory, { recursive: true })

const logFile = path.join(logDirectory, 'run.log')
try {
  fs.unlinkSync(logFile)
} catch (e) {
  if (e.code !== 'ENOENT') console.error('Could not clear old log file:', e)
}
const fileWriteStream = fs.createWriteStream(logFile, { flags: 'a' })
humanLogStream.pipe(fileWriteStream)
const extraStreams = [{ level: 'trace', stream: humanLogStream }]

const logger = reinitializeLogger(logDirectory, extraStreams)
initializeAuditLogger(logDirectory)

async function start() {
  const argv = yargs(hideBin(process.argv)).argv
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
