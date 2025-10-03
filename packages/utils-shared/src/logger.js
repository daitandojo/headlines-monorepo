// packages/utils-shared/src/logger.js
/**
 * A universal, isomorphic logger that can be safely imported in any environment
 * (Node.js, Next.js server, or client).
 *
 * It acts as a proxy. By default, it uses `console`. If a more powerful logger
 * (like Pino) is provided via the `setLogger` function at application startup,
 * it will transparently use that instead.
 */

const createSimpleLogger = () => {
  const simpleLogger = {}
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
  levels.forEach((level) => {
    const consoleMethod =
      level === 'fatal' ? 'error' : level === 'trace' || level === 'debug' ? 'log' : level
    if (typeof console[consoleMethod] === 'function') {
      simpleLogger[level] = (...args) => {
        console[consoleMethod](`[${level.toUpperCase()}]`, ...args)
      }
    } else {
      simpleLogger[level] = (...args) => {
        console.log(`[${level.toUpperCase()}]`, ...args)
      }
    }
  })
  return simpleLogger
}

let loggerInstance = createSimpleLogger()

export function setLogger(instance) {
  if (instance && typeof instance.info === 'function') {
    loggerInstance = instance
  }
}

export const logger = new Proxy(
  {},
  {
    get(target, prop) {
      // Forward any property access to the current logger instance
      return loggerInstance[prop]
    },
  }
)
