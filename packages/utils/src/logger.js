// packages/utils/src/logger.js (version 8.0.0 - FINAL)
import pino from 'pino'
import fs from 'fs'
import path from 'path'

const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

let loggerInstance

export function initializeLogger(logDirectory = null) {
  if (loggerInstance) {
    return loggerInstance
  }

  const pinoPrettyPath = path.resolve(process.cwd(), 'node_modules/pino-pretty/index.js')

  const consoleTransport = pino.transport({
    // THIS IS THE DEFINITIVE FIX: Use a direct file path
    target: pinoPrettyPath,
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore:
        'pid,hostname,runStats,article,assessment,event,payload,details,context,embedding,finalAssessment,watchlistHits,hits,reasoning,enrichmentSources,source_articles,key_individuals,source',
      singleLine: true,
      messageFormat: '{msg}',
    },
  })

  const streams = [{ level: LOG_LEVEL, stream: consoleTransport }]

  if (logDirectory && !IS_PRODUCTION) {
    if (!fs.existsSync(logDirectory)) fs.mkdirSync(logDirectory, { recursive: true })
    const errorLogFile = path.join(logDirectory, 'error.log')
    streams.push({
      level: 'warn',
      stream: fs.createWriteStream(errorLogFile, { flags: 'w' }),
    })
  }

  loggerInstance = pino({ level: 'trace' }, pino.multistream(streams))

  return loggerInstance
}

// Re-initialize a proxy to the logger instance.
export const logger = new Proxy(
  {},
  {
    get(target, prop) {
      if (loggerInstance) {
        return loggerInstance[prop]
      }
      // If called before initialization, initialize with default path.
      const defaultLogPath = path.resolve(process.cwd(), 'logs')
      initializeLogger(defaultLogPath)
      return loggerInstance[prop]
    },
  }
)

// A re-initializer that can be used by the pipeline entrypoint.
export function reinitializeLogger(logDirectory, extraStreams = []) {
  loggerInstance = null // Clear instance
  loggerInstance = initializeLogger(logDirectory, extraStreams)
  return loggerInstance
}
