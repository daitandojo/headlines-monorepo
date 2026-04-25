// apps/server/src/routes/pipelineRun.js
import { Router } from 'express'
import { verifyAdmin } from '../middleware/auth.js'
import { logger } from '@headlines/utils-shared'
import { spawn } from 'child_process'
import path from 'path'
import os from 'os'

const router = Router()
router.use(verifyAdmin)

// Track running pipelines
const runningPipelines = new Map()

router.post('/start', async (req, res) => {
  const { flags = {} } = req.body

  if (runningPipelines.size > 0) {
    const existing = Array.from(runningPipelines.keys())
    return res.status(409).json({
      error: 'A pipeline is already running.',
      runId: existing[0],
    })
  }

  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const pipelineScript = path.resolve(process.cwd(), 'apps/pipeline/src/app.js')
  const pipelineDir = path.resolve(process.cwd(), 'apps/pipeline')

  const env = {
    ...process.env,
    PIPELINE_EVENTS_URL: `http://localhost:${process.env.PORT || 3002}`,
  }

  const args = [pipelineScript]
  if (flags.source) args.push('--source', flags.source)
  if (flags.country) args.push('--country', flags.country)
  if (flags.refresh) args.push('--refresh')
  if (flags.lean) args.push('--lean')
  if (flags.test) args.push('--test')

  logger.info({ runId, args, flags }, 'Starting pipeline via HTTP API')

  const proc = spawn('node', args, {
    cwd: pipelineDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let stdout = ''
  let stderr = ''

  proc.stdout.on('data', (data) => {
    const text = data.toString()
    stdout += text
    logger.info({ runId }, text.trim())
  })

  proc.stderr.on('data', (data) => {
    const text = data.toString()
    stderr += text
    logger.warn({ runId }, text.trim())
  })

  runningPipelines.set(runId, {
    proc,
    startTime: Date.now(),
    flags,
    stdout,
  })

  proc.on('close', (code) => {
    const duration = (Date.now() - runningPipelines.get(runId)?.startTime) / 1000
    logger.info(
      { runId, code, duration },
      `Pipeline exited via HTTP API (code ${code})`,
    )
    runningPipelines.delete(runId)
  })

  proc.on('error', (err) => {
    logger.error({ err, runId }, 'Pipeline process error')
    runningPipelines.delete(runId)
  })

  return res.status(202).json({
    runId,
    status: 'started',
    streamUrl: `/api/pipeline/live/stream?runId=${runId}`,
    pid: proc.pid,
  })
})

router.post('/stop', async (req, res) => {
  const { runId } = req.body
  if (!runId) {
    return res.status(400).json({ error: 'runId is required.' })
  }

  const pipeline = runningPipelines.get(runId)
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline not found or already finished.' })
  }

  pipeline.proc.kill('SIGTERM')
  runningPipelines.delete(runId)

  return res.status(200).json({ runId, status: 'stopped' })
})

router.get('/status', async (req, res) => {
  const running = Array.from(runningPipelines.entries()).map(([id, p]) => ({
    runId: id,
    pid: p.proc.pid,
    startTime: new Date(p.startTime).toISOString(),
    duration: `${((Date.now() - p.startTime) / 1000).toFixed(1)}s`,
  }))
  return res.status(200).json({ running, count: running.length })
})

export { router as pipelineRunRoute, runningPipelines }