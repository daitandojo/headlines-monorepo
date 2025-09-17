// packages/utils/src/auditLogger.js (version 2.0)
import pino from 'pino'
import fs from 'fs'
import path from 'path'
import { Transform } from 'stream'
import { EOL } from 'os'
import moment from 'moment'
import { format } from 'util'

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
  grey: '\x1b[90m',
}

const humanAuditStream = new Transform({
  transform(chunk, enc, cb) {
    try {
      const logObject = JSON.parse(chunk)
      const { time, msg, context } = logObject
      const timestamp = moment(time).format('HH:mm:ss.SSS')
      let output = `${COLORS.cyan}--- [${timestamp}] ${msg} ---${COLORS.reset}${EOL}`

      if (context) {
        for (const [key, value] of Object.entries(context)) {
          const formattedKey = key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase())
          output += `  ${COLORS.yellow}${formattedKey}:${COLORS.reset}${EOL}`
          output += `${COLORS.grey}${format(value).replace(/^/gm, '    > ')}${COLORS.reset}${EOL}${EOL}`
        }
      }
      this.push(output)
    } catch (e) {
      this.push(chunk) // Pass through non-JSON
    }
    cb()
  },
})

let auditLoggerInstance

export function initializeAuditLogger(logDirectory) {
  if (auditLoggerInstance) return auditLoggerInstance

  if (!logDirectory) {
    throw new Error('[AuditLogger] Initialization failed: logDirectory must be provided.')
  }

  if (!fs.existsSync(logDirectory)) fs.mkdirSync(logDirectory, { recursive: true })

  const auditLogFile = path.join(logDirectory, 'run_audit.log')
  try {
    fs.unlinkSync(auditLogFile)
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Could not clear old audit log file:', e)
  }

  const fileWriteStream = fs.createWriteStream(auditLogFile, { flags: 'a' })
  humanAuditStream.pipe(fileWriteStream)

  auditLoggerInstance = pino({ level: 'info' }, humanAuditStream)
  return auditLoggerInstance
}

// Export a proxy object. This allows modules to import `auditLogger` directly,
// and it will begin working as soon as initializeAuditLogger() is called from app.js.
export const auditLogger = new Proxy(
  {},
  {
    get(target, prop) {
      if (auditLoggerInstance) {
        return auditLoggerInstance[prop]
      }
      // Fallback behavior before initialization
      if (prop === 'info' || prop === 'warn' || prop === 'error' || prop === 'fatal' || prop === 'debug' || prop === 'trace') {
        // console.warn(`[AuditLogger] Not initialized. Call to '${String(prop)}' was ignored.`)
        return () => {} // Return a no-op function to prevent crashes
      }
      return undefined
    },
  }
)
