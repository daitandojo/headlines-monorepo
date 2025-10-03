// apps/server/src/index.js
import express from 'express'
import cors from 'cors'
import pino from 'pino'
import { createRequire } from 'module'
import { env } from '@headlines/config/node'
import { setLogger } from '@headlines/utils-shared'
import dbConnect from '@headlines/data-access/dbConnect/node'
import { scrapeTestRoute } from './routes/scrapeTest.js'

const require = createRequire(import.meta.url)
const pinoPrettyPath = require.resolve('pino-pretty')
const consoleTransport = pino.transport({
  target: pinoPrettyPath,
  options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
})
const logger = pino({ level: 'info' }, consoleTransport)
setLogger(logger) // Inject logger instance

async function startServer() {
  logger.info('🚀 Starting API Server...')

  try {
    await dbConnect()
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to connect to database. Halting server.')
    process.exit(1)
  }

  const app = express()
  const PORT = process.env.PORT || 3002

  app.use(cors())
  app.use(express.json())

  app.use('/api/scrape-test', scrapeTestRoute)
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.listen(PORT, () => {
    logger.info(`✅ Server listening on http://localhost:${PORT}`)
  })
}

startServer()
