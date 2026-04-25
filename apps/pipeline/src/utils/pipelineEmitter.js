// apps/pipeline/src/utils/pipelineEmitter.js
// HTTP-based event emitter for live pipeline progress streaming.
// Pipeline sends events via HTTP to the server, which fans them out to SSE clients.
// Gracefully degrades if the server is not available or Redis is unavailable.

import { env } from '@headlines/config'
import { logger } from '@headlines/utils-shared'

let serverBaseUrl = null
let runId = null
let emitQueue = []
let isConnected = false

function getServerUrl() {
  if (!serverBaseUrl) {
    serverBaseUrl = env.PIPELINE_EVENTS_URL || env.PIPELINE_SERVER_URL || null
  }
  return serverBaseUrl
}

export function pipelineEmitter(id) {
  runId = id
  isConnected = false
  emitQueue = []

  async function safeEmit(eventType, data) {
    const serverUrl = getServerUrl()
    const event = {
      type: eventType,
      runId,
      ts: new Date().toISOString(),
      data,
    }

    if (!serverUrl) return

    // Queue the event and flush asynchronously
    emitQueue.push(event)
    if (emitQueue.length > 1) return // Already flushing

    const queue = [...emitQueue]
    emitQueue = []

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)

      const response = await fetch(`${serverUrl}/api/pipeline/live/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queue),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      isConnected = true
    } catch (err) {
      // Server not available — events are dropped silently
      isConnected = false
    }
  }

  return {
    runId: () => runId,
    isConnected: () => isConnected,

    stageStart(name) {
      safeEmit('stage_start', { name })
    },

    stageEnd(name) {
      safeEmit('stage_end', { name })
    },

    sourceStart(sourceName, sourceIndex, sourcesTotal) {
      safeEmit('source_start', { source: sourceName, index: sourceIndex, total: sourcesTotal })
    },

    sourceDone(sourceName, result = {}) {
      safeEmit('source_done', {
        source: sourceName,
        headlineCount: result.headlineCount || 0,
        freshCount: result.freshCount || 0,
        error: result.error || null,
      })
    },

    sourceError(sourceName, error) {
      safeEmit('source_error', {
        source: sourceName,
        error: error?.message || String(error),
      })
    },

    headlineFound(count, total) {
      safeEmit('headlines_found', { count, total: total || 0 })
    },

    articleScraped(headline, index) {
      safeEmit('article_scraped', {
        headline: (headline || '').slice(0, 150),
        index: index || 0,
      })
    },

    articleAssessed(result) {
      safeEmit('article_assessed', {
        headline: (result.headline || '').slice(0, 150),
        headlineScore: result.relevance_headline,
        articleScore: result.relevance_article,
      })
    },

    eventCreated(eventData) {
      safeEmit('event_created', {
        headline: (eventData.synthesized_headline || '').slice(0, 150),
        score: eventData.highest_relevance_score,
        individual: eventData.key_individuals?.[0]?.name || null,
      })
    },

    opportunityCreated(oppData) {
      safeEmit('opportunity_created', {
        name: oppData.reachOutTo,
        triggerClass: oppData.triggerClass,
        priority: oppData.priority,
        netWorthMM: oppData.profile?.estimatedNetWorthMM || 0,
      })
    },

    pipelineError(label, error) {
      safeEmit('pipeline_error', {
        label,
        error: error?.message || String(error),
      })
    },

    pipelineWarning(message) {
      safeEmit('pipeline_warning', { message })
    },

    done(stats) {
      safeEmit('pipeline_done', {
        success: true,
        stats: stats || {},
      })
    },

    // Aliases for orchestrator compatibility
    setSourcesTotal(count) {
      safeEmit('meta', { sourcesTotal: count })
    },
    setMeta(meta) {
      safeEmit('meta', meta)
    },
    close() {
      // No-op: HTTP-based emitter doesn't need cleanup
    },
  }
}