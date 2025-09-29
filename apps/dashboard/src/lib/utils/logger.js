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
