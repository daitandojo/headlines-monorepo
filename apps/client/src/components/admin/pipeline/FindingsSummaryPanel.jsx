// apps/client/src/components/admin/pipeline/FindingsSummaryPanel.jsx
'use client'

import { Badge, Button } from '@/components/shared'
import { motion } from 'framer-motion'
import { CheckCircle2, TrendingUp, AlertTriangle, Target, DollarSign } from 'lucide-react'
import Link from 'next/link'

export function FindingsSummaryPanel({ finalStats, runId, onClose }) {
  const topEvents = finalStats?.topEvents || []
  const signals = finalStats?.preDealSignals || []
  const strugglingSources = finalStats?.strugglingSources || []
  const stageDuration = finalStats?.duration || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/95 border border-green-500/30 rounded-xl p-6 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
          <div>
            <h2 className="text-lg font-bold text-green-400">Pipeline Complete</h2>
            <p className="text-sm text-slate-400">Run completed in {stageDuration}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {runId && (
            <Link href={`/admin/runs/${runId}`}>
              <Button variant="outline" size="sm">View Full Report</Button>
            </Link>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>Dismiss</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{finalStats?.eventsCreated || 0}</div>
          <div className="text-xs text-slate-400">Events</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{finalStats?.opportunitiesCreated || 0}</div>
          <div className="text-xs text-slate-400">Opportunities</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{finalStats?.articlesFound || 0}</div>
          <div className="text-xs text-slate-400">Articles Processed</div>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">{finalStats?.cost || '$0'}</div>
          <div className="text-xs text-slate-400">Est. API Cost</div>
        </div>
      </div>

      {topEvents.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4" /> Top Events
          </h3>
          <div className="space-y-1">
            {topEvents.slice(0, 5).map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/50 rounded px-2 py-1.5">
                <span className={`font-bold ${e.score >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                  [{e.score}]
                </span>
                <span className="truncate flex-1">{e.headline}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {signals.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-yellow-300 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" /> Pre-Deal Signals
          </h3>
          <div className="space-y-1">
            {signals.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-yellow-200/80 bg-yellow-500/5 rounded px-2 py-1.5">
                <span>⚠</span>
                <span className="truncate">{s.headline}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {strugglingSources.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-red-300 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" /> Struggling Sources
          </h3>
          <div className="flex flex-wrap gap-1">
            {strugglingSources.map((src, i) => (
              <Badge key={i} className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                {src}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}