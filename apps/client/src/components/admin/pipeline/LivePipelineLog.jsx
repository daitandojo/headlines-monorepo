// apps/client/src/components/admin/pipeline/LivePipelineLog.jsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PipelineProgressBar } from './PipelineProgressBar.jsx'
import { SourceGridPanel } from './SourceGridPanel.jsx'
import { ArticleFeedPanel } from './ArticleFeedPanel.jsx'
import { EventDealPanel } from './EventDealPanel.jsx'
import { OpportunityFeedPanel } from './OpportunityFeedPanel.jsx'
import { StatsBar } from './StatsBar.jsx'
import { FindingsSummaryPanel } from './FindingsSummaryPanel.jsx'

export function LivePipelineLog({ runId, onComplete }) {
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [activeStage, setActiveStage] = useState(null)
  const [completedStages, setCompletedStages] = useState([])
  const [sources, setSources] = useState([])
  const [articles, setArticles] = useState([])
  const [events, setEvents] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [finalStats, setFinalStats] = useState(null)
  const [isDone, setIsDone] = useState(false)
  const scrollRef = useRef(null)

  const sourceMap = useRef(new Map())
  const startTime = useRef(Date.now())
  const articleCounter = useRef(0)
  const eventsCreated = useRef(0)
  const opportunitiesCreated = useRef(0)
  const errorsCount = useRef(0)

  const handleEvent = useCallback((event) => {
    const { type, data } = event

    switch (type) {
      case 'meta': {
        if (data?.sourcesTotal) {
          setSources((prev) => {
            if (prev.length === 0) {
              const base = Array.from({ length: data.sourcesTotal }, (_, i) => ({
                id: `source-${i}`,
                name: `Source ${i + 1}`,
                status: 'queued',
                country: null,
                headlineCount: 0,
              }))
              return base
            }
            return prev
          })
        }
        break
      }

      case 'stage_start': {
        const stageName = data?.name
        setActiveStage(stageName)
        break
      }

      case 'stage_end': {
        const stageName = data?.name
        if (stageName) {
          setCompletedStages((prev) => [...prev, stageName])
        }
        break
      }

      case 'source_start': {
        const name = data?.source
        if (name) {
          sourceMap.current.set(name, { name, status: 'scraping', country: data?.country || null, headlineCount: 0 })
          setSources(Array.from(sourceMap.current.values()))
        }
        break
      }

      case 'source_done': {
        const name = data?.source
        if (name) {
          const existing = sourceMap.current.get(name) || {}
          sourceMap.current.set(name, {
            ...existing,
            name,
            status: data?.error ? 'error' : 'done',
            country: data?.country || existing.country,
            headlineCount: data?.headlineCount || existing.headlineCount || 0,
          })
          setSources(Array.from(sourceMap.current.values()))
        }
        break
      }

      case 'source_error': {
        const name = data?.source
        if (name) {
          const existing = sourceMap.current.get(name) || {}
          sourceMap.current.set(name, { ...existing, name, status: 'error', country: data?.country || existing.country })
          setSources(Array.from(sourceMap.current.values()))
        }
        break
      }

      case 'headlines_found': {
        if (data?.source) {
          const existing = sourceMap.current.get(data.source) || {}
          sourceMap.current.set(data.source, {
            ...existing,
            name: data.source,
            status: 'scraping',
            headlineCount: (existing.headlineCount || 0) + (data.count || 0),
          })
          setSources(Array.from(sourceMap.current.values()))
        }
        break
      }

      case 'article_scraped':
      case 'article_assessed': {
        articleCounter.current += 1
        const article = {
          id: `article-${articleCounter.current}`,
          headline: data?.headline || 'Article',
          score: data?.score || data?.relevance || 0,
          source: data?.source || data?.newspaper || 'Unknown',
          country: data?.country || null,
          assessment: data?.assessment || null,
          type,
        }
        setArticles((prev) => [...prev.slice(-99), article])
        break
      }

      case 'event_created': {
        eventsCreated.current += 1
        const ev = {
          id: `event-${eventsCreated.current}`,
          headline: data?.headline || 'New Event',
          score: data?.score || 0,
          triggerClass: data?.triggerClass || null,
          dealStatus: data?.dealStatus || null,
          amount: data?.amount || data?.valuationAtEventUSD || null,
          country: data?.country || null,
        }
        setEvents((prev) => [...prev.slice(-49), ev])
        break
      }

      case 'opportunity_created': {
        opportunitiesCreated.current += 1
        const opp = {
          id: `opp-${opportunitiesCreated.current}`,
          name: data?.name || 'Opportunity',
          netWorth: data?.netWorthMM || data?.wealthEstimate || null,
          triggerClass: data?.triggerClass || null,
          priority: data?.priority || null,
          whyContact: data?.whyContact || null,
        }
        setOpportunities((prev) => [...prev.slice(-19), opp])
        break
      }

      case 'pipeline_error': {
        errorsCount.current += 1
        break
      }

      case 'pipeline_done': {
        const doneData = data?.stats || data || {}
        const topEvents = (doneData.synthesizedEventsForReport || []).slice(0, 5).map(e => ({
          headline: e.synthesized_headline,
          score: e.highest_relevance_score,
        }))
        const scraperFailures = (doneData.scraperHealth || []).filter(h => !h.success).map(h => h.source || h.name).filter(Boolean)
        setFinalStats({
          eventsCreated: eventsCreated.current,
          opportunitiesCreated: opportunitiesCreated.current,
          articlesFound: articleCounter.current,
          duration: doneData.duration ? `${doneData.duration.toFixed(0)}s` : `${Math.floor((Date.now() - startTime.current) / 1000)}s`,
          cost: doneData.tokenUsage?.totalCost ? `$${doneData.tokenUsage.totalCost.toFixed(2)}` : '-',
          topEvents,
          preDealSignals: doneData.preDealSignals || [],
          strugglingSources: scraperFailures,
        })
        setIsDone(true)
        onComplete?.(data)
        break
      }

      case 'pipeline_warning':
        break

      default:
        break
    }
  }, [onComplete])

  useEffect(() => {
    if (!runId) return

    startTime.current = Date.now()
    setConnectionStatus('connecting')
    setActiveStage(null)
    setCompletedStages([])
    setSources([])
    setArticles([])
    setEvents([])
    setOpportunities([])
    setFinalStats(null)
    setIsDone(false)
    sourceMap.current.clear()
    articleCounter.current = 0
    eventsCreated.current = 0
    opportunitiesCreated.current = 0
    errorsCount.current = 0

    const eventSource = new EventSource(`/api/pipeline/live?runId=${runId}&endpoint=stream`)

    eventSource.onopen = () => setConnectionStatus('connected')
    eventSource.onerror = () => setConnectionStatus('disconnected')

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        handleEvent(event)
      } catch (err) {
        console.error('SSE parse error:', err)
      }
    }

    return () => {
      eventSource.close()
      setConnectionStatus('disconnected')
    }
  }, [runId, handleEvent])

  const stats = {
    sourcesTotal: sources.length,
    sourcesDone: sources.filter(s => s.status === 'done' || s.status === 'error').length,
    articlesFound: articleCounter.current,
    eventsCreated: eventsCreated.current,
    opportunitiesCreated: opportunitiesCreated.current,
    errors: errorsCount.current,
    currentStage: activeStage,
    startTime: startTime.current,
    isConnected: connectionStatus === 'connected',
    isDone,
  }

  if (isDone && finalStats) {
    return (
      <div className="flex flex-col h-full bg-slate-950">
        <div className="flex-1 overflow-y-auto p-4">
          <FindingsSummaryPanel
            finalStats={finalStats}
            runId={runId}
            onClose={() => {
              setFinalStats(null)
              setIsDone(false)
            }}
          />
        </div>
        <StatsBar stats={stats} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Progress Bar */}
      <div className="px-4 pt-3 pb-1 bg-slate-900/50 border-b border-slate-800">
        <PipelineProgressBar activeStage={activeStage} completedStages={completedStages} />
      </div>

      {/* Panel Grid */}
      <div className="flex-1 grid grid-cols-4 gap-0 overflow-hidden" style={{ gridTemplateRows: '1fr 1fr' }}>
        {/* Top-Left: Source Grid */}
        <div className="col-span-1 row-span-1 border-r border-b border-slate-800 overflow-hidden flex flex-col">
          <div className="text-xs font-semibold text-slate-400 px-3 py-2 bg-slate-900/30 border-b border-slate-800 shrink-0">
            Sources ({sources.filter(s => s.status === 'done').length}/{sources.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            <SourceGridPanel sources={sources} />
          </div>
        </div>

        {/* Top-Center: Article Feed */}
        <div className="col-span-2 row-span-1 border-r border-b border-slate-800 overflow-hidden flex flex-col">
          <div className="text-xs font-semibold text-slate-400 px-3 py-2 bg-slate-900/30 border-b border-slate-800 shrink-0">
            Live Articles ({articleCounter.current})
          </div>
          <div className="flex-1 overflow-y-auto">
            <ArticleFeedPanel articles={articles} />
          </div>
        </div>

        {/* Top-Right: Events & Deals */}
        <div className="col-span-1 row-span-2 border-b border-slate-800 overflow-hidden flex flex-col">
          <div className="text-xs font-semibold text-purple-400 px-3 py-2 bg-slate-900/30 border-b border-slate-800 shrink-0">
            Events & Deals ({eventsCreated.current})
          </div>
          <div className="flex-1 overflow-y-auto">
            <EventDealPanel events={events} />
          </div>
        </div>

        {/* Bottom-Left: Original raw log */}
        <div className="col-span-1 row-span-1 border-r border-slate-800 overflow-hidden flex flex-col">
          <div className="text-xs font-semibold text-slate-500 px-3 py-2 bg-slate-900/30 border-b border-slate-800 shrink-0">
            Raw Event Log
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 font-mono text-[10px]">
            <LogView runId={runId} />
          </div>
        </div>

        {/* Bottom-Center: Opportunities */}
        <div className="col-span-1 row-span-1 border-r border-slate-800 overflow-hidden flex flex-col">
          <div className="text-xs font-semibold text-amber-400 px-3 py-2 bg-slate-900/30 border-b border-slate-800 shrink-0">
            Opportunities ({opportunitiesCreated.current})
          </div>
          <div className="flex-1 overflow-y-auto">
            <OpportunityFeedPanel opportunities={opportunities} />
          </div>
        </div>

        {/* Bottom-Right: Connection info */}
        <div className="col-span-1 row-span-1 overflow-hidden flex flex-col">
          <div className="text-xs font-semibold text-slate-500 px-3 py-2 bg-slate-900/30 border-b border-slate-800 shrink-0">
            Pipeline Status
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                connectionStatus === 'connected'
                  ? 'bg-green-500/20 text-green-400'
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                <span className={`h-2 w-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                  connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
                }`} />
                {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </div>
              {activeStage && (
                <p className="text-xs text-slate-500 mt-2">Current: {activeStage}</p>
              )}
              <div className="mt-3 text-[10px] text-slate-600">
                {sources.length} sources · {completedStages.length} stages done
              </div>
            </div>
          </div>
        </div>
      </div>

      <StatsBar stats={stats} />
    </div>
  )
}

function LogView({ runId }) {
  const [logLines, setLogLines] = useState([])
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!runId) return
    const es = new EventSource(`/api/pipeline/live?runId=${runId}&endpoint=stream`)
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        const ts = event.ts ? new Date(event.ts).toLocaleTimeString() : ''
        const msg = brief(event)
        setLogLines((prev) => [...prev.slice(-49), `${ts} ${msg}`])
      } catch {}
    }
    return () => es.close()
  }, [runId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logLines])

  if (logLines.length === 0) {
    return <div className="text-slate-600 italic">Waiting for events...</div>
  }

  return (
    <div ref={scrollRef} className="space-y-0.5">
      {logLines.map((line, i) => (
        <div key={i} className="text-slate-400 leading-tight">{line}</div>
      ))}
    </div>
  )
}

function brief(event) {
  const { type, data } = event
  switch (type) {
    case 'stage_start': return `→ ${data?.name}`
    case 'stage_end': return `✓ ${data?.name}`
    case 'source_start': return `📡 ${data?.source}`
    case 'source_done': return `✅ ${data?.source}: ${data?.headlineCount || 0}h`
    case 'headlines_found': return `📰 +${data?.count || 0} headlines`
    case 'article_scraped': return `📄 ${(data?.headline || '').slice(0, 40)}`
    case 'event_created': return `⚡ ${(data?.headline || '').slice(0, 40)}`
    case 'opportunity_created': return `🎯 ${data?.name}`
    case 'pipeline_done': return `🏁 Done`
    case 'pipeline_error': return `❌ ERROR: ${data?.error}`
    case 'pipeline_warning': return `⚠ ${data?.message}`
    case 'meta': return `📊 meta`
    default: return `${type}`
  }
}