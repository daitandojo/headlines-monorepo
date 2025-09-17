// apps/pipeline/src/utils/errorStream.js (version 3.0.0)
import pino from 'pino'
import fs from 'fs'
import path from 'path'

const logDir = path.join(process.cwd(), 'apps/pipeline/logs')
const errorLogFile = path.join(logDir, 'error.log')

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}
try {
  fs.unlinkSync(errorLogFile)
} catch (error) {
  if (error.code !== 'ENOENT') {
    console.error('Could not clear old error log file:', error)
  }
}

const errorFileTransport = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: false,
    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
    ignore: 'pid,hostname',
    singleLine: false,
    destination: errorLogFile,
    mkdir: true,
    append: true,
  },
})

// This stream only logs levels 'warn' and above.
const errorStream = {
  level: 'warn',
  stream: errorFileTransport,
}

export default errorStream
