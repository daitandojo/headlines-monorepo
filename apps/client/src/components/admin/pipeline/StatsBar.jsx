// apps/client/src/components/admin/pipeline/StatsBar.jsx
'use client'

import { Badge } from '@/components/shared'
import { Clock, Globe, FileText, Zap, Target, DollarSign, AlertTriangle } from 'lucide-react'

export function StatsBar({ stats }) {
  const duration = stats.startTime
    ? `${Math.floor((Date.now() - stats.startTime) / 1000)}s`
    : '0s'

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 border-t border-slate-800 text-xs">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Clock className="w-3.5 h-3.5" />
        <span>{duration}</span>
      </div>
      <div className="w-px h-4 bg-slate-700" />
      <Badge variant="outline" className="border-slate-600 text-slate-300 gap-1">
        <Globe className="w-3 h-3" /> Sources: {stats.sourcesDone}/{stats.sourcesTotal}
      </Badge>
      <Badge variant="outline" className="border-blue-600 text-blue-300 gap-1">
        <FileText className="w-3 h-3" /> Articles: {stats.articlesFound}
      </Badge>
      <Badge variant="outline" className="border-purple-600 text-purple-300 gap-1">
        <Zap className="w-3 h-3" /> Events: {stats.eventsCreated}
      </Badge>
      <Badge variant="outline" className="border-amber-600 text-amber-300 gap-1">
        <Target className="w-3 h-3" /> Opps: {stats.opportunitiesCreated}
      </Badge>
      <Badge variant="outline" className="border-green-600 text-green-300 gap-1">
        <DollarSign className="w-3 h-3" /> {stats.currentStage || 'Idle'}
      </Badge>
      {stats.errors > 0 && (
        <Badge variant="outline" className="border-red-600 text-red-300 gap-1">
          <AlertTriangle className="w-3 h-3" /> Errors: {stats.errors}
        </Badge>
      )}
      {stats.isConnected && (
        <div className="ml-auto flex items-center gap-1.5 text-green-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span>Live</span>
        </div>
      )}
      {stats.isDone && (
        <div className="ml-auto flex items-center gap-1.5 text-green-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span>Complete</span>
        </div>
      )}
    </div>
  )
}