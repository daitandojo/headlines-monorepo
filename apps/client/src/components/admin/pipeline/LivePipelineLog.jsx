// apps/client/src/components/admin/pipeline/LivePipelineLog.jsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Badge } from '@/components/shared'
import { Play, Square, Loader2, Terminal, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react'

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString()
}

function EventIcon({ type }) {
  if (type === 'pipeline_done') return <CheckCircle2 className="h-4 w-4 text-green-400" />
  if (type === 'pipeline_error') return <XCircle className="h-4 w-4 text-red-400" />
  if (type === 'pipeline_warning') return <AlertTriangle className="h-4 w-4 text-amber-400" />
  if (type === 'source_start') return <Play className="h-4 w-4 text-blue-400" />
  if (type === 'source_done') return <CheckCircle2 className="h-4 w-4 text-green-400" />
  if (type === 'event_created') return <CheckCircle2 className="h-4 w-4 text-purple-400" />
  if (type === 'opportunity_created') return <CheckCircle2 className="h-4 w-4 text-amber-400" />
  if (type === 'stage_start' || type === 'stage_end') return <Clock className="h-4 w-4 text-slate-400" />
  return <Terminal className="h-4 w-4 text-slate-500" />
}

function EventRow({ event }) {
  const { type, ts, data } = event
  const time = formatTime(ts)

  let message = type
  if (type === 'source_start') {
    message = `Scraping ${data?.source} (${data?.index}/${data?.total})`
  } else if (type === 'source_done') {
    message = `${data?.source}: ${data?.headlineCount} headlines${data?.error ? ` — ERROR: ${data.error}` : ''}`
  } else if (type === 'headlines_found') {
    message = `Found ${data?.count} headlines (total: ${data?.total})`
  } else if (type === 'event_created') {
    message = `Event: ${data?.headline?.slice(0, 80)}... [${data?.score}]`
  } else if (type === 'opportunity_created') {
    message = `Opportunity: ${data?.name} (${data?.triggerClass}, $${data?.netWorthMM}M)`
  } else if (type === 'stage_start') {
    message = `→ Stage: ${data?.name}`
  } else if (type === 'stage_end') {
    message = `✓ Stage: ${data?.name} complete`
  } else if (type === 'pipeline_done') {
    message = `Pipeline complete — ${data?.stats?.eventsCreated || 0} events, ${data?.stats?.opportunitiesCreated || 0} opportunities`
  } else if (type === 'pipeline_error') {
    message = `ERROR: ${data?.error}`
  } else if (type === 'pipeline_warning') {
    message = `Warning: ${data?.message}`
  } else if (type === 'article_scraped') {
    message = `Article: ${data?.headline?.slice(0, 60)}...`
  } else if (type === 'meta') {
    message = `Meta: ${JSON.stringify(data).slice(0, 60)}`
  }

  return (
    <div className="flex items-start gap-2 text-sm font-mono py-1">
      <span className="text-slate-500 text-xs w-20 shrink-0">{time}</span>
      <EventIcon type={type} />
      <span className={`
        ${type === 'pipeline_done' ? 'text-green-400' : ''}
        ${type === 'pipeline_error' ? 'text-red-400' : ''}
        ${type === 'pipeline_warning' ? 'text-amber-400' : ''}
        ${type === 'source_start' ? 'text-blue-400' : ''}
        ${type === 'source_done' && data?.error ? 'text-red-400' : ''}
        ${type === 'event_created' ? 'text-purple-400' : ''}
        ${type === 'opportunity_created' ? 'text-amber-400' : ''}
      `}>
        {message}
      </span>
    </div>
  )
}

export function LivePipelineLog({ runId, onComplete }) {
  const [events, setEvents] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!runId) return

    const serverUrl = process.env.NEXT_PUBLIC_PIPELINE_SERVER_URL || 'http://localhost:3002'
    const eventSource = new EventSource(`${serverUrl}/api/pipeline/live/stream?runId=${runId}`)

    eventSource.onopen = () => setIsConnected(true)
    eventSource.onerror = () => setIsConnected(false)

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        setEvents((prev) => [...prev.slice(-199), event])

        if (event.type === 'pipeline_done') {
          setIsDone(true)
          onComplete?.(event.data)
        }
      } catch (err) {
        console.error('SSE parse error:', err)
      }
    }

    return () => {
      eventSource.close()
      setIsConnected(false)
    }
  }, [runId, onComplete])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events])

  const stats = {
    sourcesTotal: events.find((e) => e.type === 'meta')?.data?.sourcesTotal || 0,
    headlinesFound: events.filter((e) => e.type === 'headlines_found').reduce((sum, e) => sum + (e.data?.count || 0), 0),
    eventsCreated: events.filter((e) => e.type === 'event_created').length,
    opportunitiesCreated: events.filter((e) => e.type === 'opportunity_created').length,
    errors: events.filter((e) => e.type === 'pipeline_error').length,
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with stats */}
      <div className="flex items-center gap-4 p-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-sm text-slate-400">
            {isDone ? 'Complete' : isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>

        <div className="flex gap-4 text-sm">
          <Badge variant="outline" className="border-slate-600">
            Sources: {stats.sourcesTotal}
          </Badge>
          <Badge variant="outline" className="border-blue-600 text-blue-400">
            Headlines: {stats.headlinesFound}
          </Badge>
          <Badge variant="outline" className="border-purple-600 text-purple-400">
            Events: {stats.eventsCreated}
          </Badge>
          <Badge variant="outline" className="border-amber-600 text-amber-400">
            Opps: {stats.opportunitiesCreated}
          </Badge>
          {stats.errors > 0 && (
            <Badge variant="outline" className="border-red-600 text-red-400">
              Errors: {stats.errors}
            </Badge>
          )}
        </div>
      </div>

      {/* Log output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 bg-slate-950 font-mono text-xs"
      >
        {events.length === 0 ? (
          <div className="text-slate-500 italic">Waiting for pipeline to start...</div>
        ) : (
          events.map((event, i) => (
            <EventRow key={i} event={event} />
          ))
        )}
      </div>
    </div>
  )
}