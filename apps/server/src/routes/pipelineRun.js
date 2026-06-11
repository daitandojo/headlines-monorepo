// apps/server/src/routes/pipelineRun.js
import { Router } from 'express'
import { verifyAdmin } from '../middleware/auth.js'
import { logger } from '@headlines/utils-shared'
import { spawn } from 'child_process'
import path from 'path'
import os from 'os'
import { z } from 'zod'

const router = Router()
router.use(verifyAdmin)

const startSchema = z.object({
  flags: z.object({
    source: z.string().optional(),
    country: z.string().optional(),
    refresh: z.boolean().optional(),
    lean: z.boolean().optional(),
    test: z.boolean().optional(),
  }).optional().default({}),
})

const stopSchema = z.object({
  runId: z.string().min(1, 'runId is required'),
})

// Track running pipelines
const runningPipelines = new Map()

router.post('/start', async (req, res) => {
  const parsed = startSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' })
  }
  const { flags } = parsed.data

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

  const eventsUrl = process.env.PIPELINE_SERVER_URL || `http://localhost:${process.env.PORT || 3002}`
  const env = {
    ...process.env,
    PIPELINE_RUN_ID: runId,
    PIPELINE_EVENTS_URL: eventsUrl,
  }

  const args = [pipelineScript]
  if (flags.source) args.push('--source', flags.source)
  if (flags.country) args.push('--country', flags.country)
  if (flags.refresh) args.push('--refresh')
  if (flags.lean) args.push('--lean')
  if (flags.test) args.push('--test')

  logger.info(`Starting pipeline: ${runId}`)

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
    logger.info(`[${runId}] ${text.trim()}`)
  })

  proc.stderr.on('data', (data) => {
    const text = data.toString()
    stderr += text
    logger.warn(`[${runId}] ${text.trim()}`)
  })

  runningPipelines.set(runId, {
    proc,
    startTime: Date.now(),
    flags,
    stdout,
  })

  proc.on('close', (code) => {
    const endTime = Date.now()
    const duration = (endTime - runningPipelines.get(runId)?.startTime) / 1000
    logger.info(`Pipeline ${runId} exited (code ${code}) after ${duration.toFixed(1)}s`)
    runningPipelinesHistory.set(runId, { endTime, duration: `${duration.toFixed(0)}s` })
    runningPipelines.delete(runId)
    if (runningPipelinesHistory.size > 20) {
      const oldest = Array.from(runningPipelinesHistory.keys()).sort((a, b) =>
        runningPipelinesHistory.get(a).endTime - runningPipelinesHistory.get(b).endTime
      )[0]
      runningPipelinesHistory.delete(oldest)
    }
  })

  proc.on('error', (err) => {
    logger.error(`Pipeline process error: ${err.message?.substring(0, 80) || ''}`)
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
  const parsed = stopSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' })
  }
  const { runId } = parsed.data

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
  const recent = Array.from(runningPipelinesHistory.entries())
    .sort((a, b) => b[1].endTime - a[1].endTime)
    .slice(0, 10)
    .map(([id, p]) => ({
      runId: id,
      duration: p.duration,
      endTime: new Date(p.endTime).toISOString(),
    }))
  return res.status(200).json({ running, count: running.length, recent })
})

const runningPipelinesHistory = new Map()
export { router as pipelineRunRoute, runningPipelines, runningPipelinesHistory }