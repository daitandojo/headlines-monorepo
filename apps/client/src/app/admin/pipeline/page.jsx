// apps/client/src/app/admin/pipeline/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { Button, Card } from '@/components/shared'
import { Play, Square, RefreshCw, Zap, Settings, ChevronDown, ChevronUp, History } from 'lucide-react'
import { toast } from 'sonner'
import { LivePipelineLog } from '@/components/admin/pipeline/LivePipelineLog'

const PIPELINE_FLAGS = [
  { key: 'refresh', label: 'Refresh Mode', description: 'Re-process relevant articles from last 24h', icon: RefreshCw },
  { key: 'lean', label: 'Lean Mode', description: 'Single highest-scoring article only', icon: Zap },
  { key: 'test', label: 'Test Mode', description: 'Synthetic test article', icon: Settings },
]

export default function PipelineRunnerPage() {
  const [runId, setRunId] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [flags, setFlags] = useState({})
  const [status, setStatus] = useState(null)
  const [showOptions, setShowOptions] = useState(false)
  const [recentRuns, setRecentRuns] = useState([])

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  async function loadStatus() {
    try {
      const res = await fetch('/api/pipeline/run')
      const data = await res.json()
      setStatus(data)
      setIsRunning(data?.running?.length > 0)
      if (data?.running?.[0]) {
        setRunId(data.running[0].runId)
      }
      if (data?.recent) {
        setRecentRuns(data.recent.slice(0, 5))
      }
    } catch {}
  }

  async function startPipeline() {
    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flags }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to start pipeline')
        return
      }

      setRunId(data.runId)
      setIsRunning(true)
      toast.success(`Pipeline started (${data.runId.slice(0, 20)}...)`)
    } catch (err) {
      toast.error('Failed to start pipeline')
    }
  }

  async function stopPipeline() {
    if (!runId) return

    if (!window.confirm('Are you sure you want to stop the pipeline? Any in-progress work will be lost.')) {
      return
    }

    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, action: 'stop' }),
      })
      if (res.ok) {
        setIsRunning(false)
        toast.info('Pipeline stop requested')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to stop')
      }
    } catch {
      toast.error('Failed to stop pipeline')
    }
  }

  const toggleFlag = (key) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const flagCount = Object.values(flags).filter(Boolean).length

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Pipeline Command Center</h1>
          <p className="text-sm text-slate-500">Monitor and control the intelligence pipeline in real-time</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Flag indicator */}
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hover:border-slate-600 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            {flagCount > 0 ? `${flagCount} active` : 'Options'}
            {showOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {!isRunning ? (
            <Button onClick={startPipeline} className="bg-green-600 hover:bg-green-500 text-white gap-2">
              <Play className="w-4 h-4" />
              Start Pipeline
            </Button>
          ) : (
            <Button onClick={stopPipeline} variant="destructive" className="gap-2">
              <Square className="w-4 h-4" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Collapsible options */}
      {showOptions && !isRunning && (
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/30 shrink-0">
          <div className="flex gap-3">
            {PIPELINE_FLAGS.map((flag) => (
              <button
                key={flag.key}
                onClick={() => toggleFlag(flag.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all text-sm ${
                  flags[flag.key]
                    ? 'border-blue-500 bg-blue-500/10 text-blue-300 shadow-sm shadow-blue-500/10'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <flag.icon className="w-4 h-4" />
                <span className="font-medium">{flag.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-2 ml-1">
            All modes work with the pipeline run from the terminal too (<code className="text-slate-500 bg-slate-800 px-1 py-0.5 rounded">pnpm pipeline --refresh</code>)
          </p>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-0">
        {runId || isRunning ? (
          <LivePipelineLog
            runId={runId}
            onComplete={(stats) => {
              setIsRunning(false)
              loadStatus()
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                <Play className="w-8 h-8 text-slate-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-300 mb-2">Pipeline is Idle</h2>
              <p className="text-sm text-slate-500 mb-6">
                Click &quot;Start Pipeline&quot; to begin a new intelligence run.
                {flagCount > 0 && ` ${flagCount} option${flagCount > 1 ? 's are' : ' is'} active.`}
              </p>

              {recentRuns.length > 0 && (
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/50">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                    <History className="w-3.5 h-3.5" />
                    <span>Recent runs</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {recentRuns.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-slate-500">
                        <span className="font-mono">{r.runId?.slice(0, 24)}...</span>
                        <span>{r.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}