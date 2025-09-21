import pino from 'pino'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
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
export function initializeLogger(logDirectory = null) {
  if (loggerInstance) {
    return loggerInstance
  }
  if (process.env.NEXT_RUNTIME) {
    console.log('Detected Next.js runtime. Initializing safe console logger.')
    loggerInstance = createSimpleLogger()
    return loggerInstance
  }
  console.log('Detected standard Node.js runtime. Initializing pino logger.')
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
export const logger = new Proxy(
  {},
  {
    get(target, prop) {
      if (loggerInstance) {
        return loggerInstance[prop]
      }
      const defaultLogPath = path.resolve(process.cwd(), 'logs')
      initializeLogger(defaultLogPath)
      return loggerInstance[prop]
    },
  }
)
export function reinitializeLogger(logDirectory, extraStreams = []) {
  loggerInstance = null
  loggerInstance = initializeLogger(logDirectory, extraStreams)
  return loggerInstance
}
