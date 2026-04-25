// apps/client/src/app/admin/pipeline/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/components/shared'
import { Play, Square, Loader2, RefreshCw, Zap, FileText, Users, Target, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { LivePipelineLog } from '@/components/admin/pipeline/LivePipelineLog'

const PIPELINE_FLAGS = [
  { key: 'refresh', label: 'Refresh Mode', description: 'Re-process relevant articles from last 24h', icon: RefreshCw },
  { key: 'lean', label: 'Lean Mode', description: 'Test with single highest-scoring article', icon: Zap },
  { key: 'test', label: 'Test Mode', description: 'Synthetic test article only', icon: Settings },
]

export default function PipelineRunnerPage() {
  const [runId, setRunId] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [flags, setFlags] = useState({})
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchStatus() {
    try {
      const res = await fetch('/api/pipeline/run')
      const data = await res.json()
      setStatus(data)
      setIsRunning(data.running?.length > 0)
      if (data.running?.[0]) {
        setRunId(data.running[0].runId)
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
      toast.success(`Pipeline started (${data.runId})`)
    } catch (err) {
      toast.error('Failed to start pipeline')
    }
  }

  async function stopPipeline() {
    if (!runId) return

    try {
      await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, action: 'stop' }),
      })
      setIsRunning(false)
      toast.info('Pipeline stop requested')
    } catch {}
  }

  const toggleFlag = (key) => {
    setFlags((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Pipeline Runner</h1>
          <p className="text-slate-400">Execute the intelligence pipeline and monitor live progress</p>
        </div>

        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={startPipeline} className="bg-green-600 hover:bg-green-500">
              <Play className="h-4 w-4 mr-2" />
              Start Pipeline
            </Button>
          ) : (
            <Button onClick={stopPipeline} variant="destructive">
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Flag selection */}
      {!isRunning && (
        <div className="flex gap-3 mb-4">
          {PIPELINE_FLAGS.map((flag) => (
            <button
              key={flag.key}
              onClick={() => toggleFlag(flag.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                flags[flag.key]
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
              }`}
            >
              <flag.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{flag.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Live log */}
      <Card className="flex-1 min-h-0 bg-slate-950 border-slate-800">
        {isRunning || runId ? (
          <LivePipelineLog
            runId={runId}
            onComplete={(stats) => {
              setIsRunning(false)
              toast.success('Pipeline completed', {
                description: `${stats?.stats?.eventsCreated || 0} events, ${stats?.stats?.opportunitiesCreated || 0} opportunities`,
              })
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Pipeline is idle</p>
              <p className="text-sm mt-2">Select options above and click Start to run</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}