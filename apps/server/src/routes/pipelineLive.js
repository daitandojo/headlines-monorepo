// apps/server/src/routes/pipelineLive.js
import { Router } from 'express'
import { verifyAdmin } from '../middleware/auth.js'
import { logger } from '@headlines/utils-shared'
import { spawn } from 'child_process'
import path from 'path'

const router = Router()

// In-memory event store for active runs
const activeStreams = new Map()
const MAX_EVENTS = 200

// SSE stream – admin only (exposes internal pipeline events)
router.get('/stream', verifyAdmin, async (req, res) => {
  const runId = req.query.runId
  if (!runId) {
    return res.status(400).json({ error: 'runId is required.' })
  }

  if (!activeStreams.has(runId)) {
    activeStreams.set(runId, { events: [], clients: new Set() })
  }

  const runState = activeStreams.get(runId)

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  runState.clients.add(res)

  const sendEvent = (data) => {
    if (res.writableEnded) return
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    } catch {}
  }

  runState.clients.add(res)

  const keepalive = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(keepalive)
      runState.clients.delete(res)
      return
    }
    res.write(':ping\n\n')
  }, 25000)

  res.on('close', () => {
    clearInterval(keepalive)
    runState.clients.delete(res)
    if (runState.clients.size === 0) {
      activeStreams.delete(runId)
    }
  })

  for (const event of runState.events) {
    sendEvent(event)
  }

  if (runState.done) {
    sendEvent({ type: 'pipeline_done', ts: new Date().toISOString(), data: runState.done })
    clearInterval(keepalive)
    res.end()
    runState.clients.delete(res)
  }
})

router.post('/events', async (req, res) => {
  const { events } = req.body
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events array is required.' })
  }

  const runId = events[0].runId
  if (!runId) {
    return res.status(400).json({ error: 'runId is required.' })
  }

  if (!activeStreams.has(runId)) {
    activeStreams.set(runId, { events: [], clients: new Set(), done: null })
  }

  const runState = activeStreams.get(runId)

  for (const event of events) {
    runState.events.push(event)
    if (runState.events.length > MAX_EVENTS) {
      runState.events.shift()
    }
  }

  const sendToClients = (data) => {
    for (const client of runState.clients) {
      if (client.writableEnded) continue
      try {
        client.write(`data: ${JSON.stringify(data)}\n\n`)
      } catch {}
    }
  }

  for (const event of events) {
    sendToClients(event)
  }

  return res.status(200).json({ received: events.length })
})

router.get('/meta', verifyAdmin, async (req, res) => {
  const runId = req.query.runId
  if (!runId) {
    return res.status(400).json({ error: 'runId is required.' })
  }

  const runState = activeStreams.get(runId)
  if (!runState) {
    return res.status(404).json({ error: 'Run not found.' })
  }

  const lastMeta = runState.events.filter((e) => e.type === 'meta').pop()
  return res.status(200).json(lastMeta || {})
})

router.get('/status', verifyAdmin, async (req, res) => {
  const active = Array.from(activeStreams.keys()).map((id) => ({
    runId: id,
    eventCount: activeStreams.get(id).events.length,
    clientCount: activeStreams.get(id).clients.size,
    done: !!activeStreams.get(id).done,
  }))
  return res.status(200).json({ active, count: active.length })
})

export { router as pipelineLiveRoute, activeStreams }