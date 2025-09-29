// packages/utils-server/src/logger.js
import pino from 'pino'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const LOG_LEVEL = process.env.LOG_LEVEL || 'trace'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

let loggerInstance

const createSimpleLogger = () => {
  const simpleLogger = {}
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
  levels.forEach((level) => {
    const consoleMethod = level === 'trace' || level === 'debug' ? 'log' : level
    simpleLogger[level] = (...args) => {
      console[consoleMethod](`[${level.toUpperCase()}]`, ...args)
    }
  })
  return simpleLogger
}

export function initializeLogger(logDirectory = null, extraStreams = []) {
  if (loggerInstance) {
    return loggerInstance
  }

  if (process.env.NEXT_RUNTIME) {
    console.log('Detected Next.js runtime. Initializing safe console logger.')
    loggerInstance = createSimpleLogger()
    return loggerInstance
  }

  const pinoPrettyPath = require.resolve('pino-pretty')
  const consoleTransport = pino.transport({
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

  const streams = [{ level: LOG_LEVEL, stream: consoleTransport }, ...extraStreams]

  loggerInstance = pino({ level: 'trace' }, pino.multistream(streams))
  return loggerInstance
}

export const logger = new Proxy(
  {},
  {
    get(target, prop) {
      if (loggerInstance) {
        return loggerInstance[prop]
      }
      return initializeLogger()[prop]
    },
  }
)

export function reinitializeLogger(logDirectory, extraStreams = []) {
  const pinoPrettyPath = require.resolve('pino-pretty')

  const consoleTransport = {
    level: LOG_LEVEL,
    target: pinoPrettyPath,
    options: {
      colorize: true,
      translateTime: 'HH:mm:ss',
      ignore: 'pid,hostname,context',
      singleLine: true,
      messageFormat: '{msg}',
    },
  }

  const logFile = path.join(logDirectory, 'run.log')
  const fileTransport = {
    level: 'trace',
    target: pinoPrettyPath,
    options: {
      colorize: false,
      // DEFINITIVE FIX: Use 'mm' for minutes and 'MM' for month.
      translateTime: 'YYYY/MM/DD HH:mm:ss',
      ignore: 'pid,hostname',
      destination: logFile,
      mkdir: true,
      append: false,
    },
  }

  const allStreams = [
    pino.transport(consoleTransport),
    pino.transport(fileTransport),
    ...extraStreams,
  ]

  loggerInstance = pino({ level: 'trace' }, pino.multistream(allStreams))

  return loggerInstance
}
