// apps/pipeline/src/app.js
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import pino from 'pino'
import { setLogger } from '@headlines/utils-shared'
import { initializeAuditLogger } from './utils/auditLogger.js'
import { runPipeline } from './orchestrator.js'
import mongoose from 'mongoose'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '../../..')
const logDirectory = path.join(PROJECT_ROOT, 'apps/pipeline/logs')
if (!fs.existsSync(logDirectory)) fs.mkdirSync(logDirectory, { recursive: true })

const pinoPrettyPath = require.resolve('pino-pretty')
const logFile = path.join(logDirectory, 'run.log')
try {
  fs.unlinkSync(logFile)
} catch (e) {
  if (e.code !== 'ENOENT') console.error('Could not clear old run log file:', e)
}
const consoleTransport = pino.transport({
  target: pinoPrettyPath,
  options: { colorize: true, translateTime: 'HH:mm:ss', ignore: 'pid,hostname,context' },
})
const fileTransport = pino.transport({
  target: pinoPrettyPath,
  options: {
    colorize: false,
    translateTime: 'YYYY/MM/DD HH:mm:ss',
    destination: logFile,
  },
})
const logger = pino(
  { level: 'trace' },
  pino.multistream([consoleTransport, fileTransport])
)
setLogger(logger)
initializeAuditLogger(logDirectory)

async function start() {
  const argv = yargs(hideBin(process.argv))
    .option('source', { alias: 's', type: 'string' })
    .option('country', { alias: 'c', type: 'string' })
    .option('deleteToday', { type: 'boolean' })
    .option('useTestPayload', { type: 'boolean' })
    .option('refresh', {
      type: 'boolean',
      description:
        'Finds and re-processes only the relevant articles from the last 24 hours.',
    })
    .option('skipdeepdive', {
      type: 'boolean',
      description:
        'Skips the expensive Stage 4.5 Opportunity Deep Dive for faster testing.',
    })
    .option('lean', {
      type: 'boolean',
      description:
        'Ultra-fast test mode. Assesses all headlines but only processes the single highest-scoring article through the entire pipeline.',
    })
    .option('test', {
      type: 'boolean',
      description:
        'Runs a full end-to-end pipeline test with a single, high-quality synthetic article, notifying only admins.',
    })
    .help().argv

  const paths = {
    debugHtmlDir: path.join(logDirectory, 'debug_html'),
  }

  const options = {
    ...argv,
    paths,
    countryFilter: argv.country,
    sourceFilter: argv.source,
  }

  logger.info('--- Pipeline Execution Flags ---')
  Object.entries(options).forEach(([key, value]) => {
    if (value) logger.info(`- ${key}: ${value}`)
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
      'Pipeline completed with one or more fatal errors. The process will now exit.'
    )
  } else {
    logger.info('Pipeline completed successfully. The process will now exit.')
  }
}

start()
