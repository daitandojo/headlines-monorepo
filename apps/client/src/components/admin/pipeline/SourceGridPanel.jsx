// apps/client/src/components/admin/pipeline/SourceGridPanel.jsx
'use client'

import { Badge } from '@/components/shared'
import { Loader2, CheckCircle2, XCircle, Globe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function SourceGridPanel({ sources = [] }) {
  if (sources.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm italic">
        Waiting for sources...
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 p-2">
      <AnimatePresence>
        {sources.map((src) => (
          <motion.div
            key={src.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-lg border p-3 transition-colors ${
              src.status === 'error'
                ? 'bg-red-500/10 border-red-500/30'
                : src.status === 'done'
                ? 'bg-green-500/10 border-green-500/30'
                : src.status === 'scraping'
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-slate-800/50 border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-200 truncate">{src.name}</span>
              {src.status === 'scraping' && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />}
              {src.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />}
              {src.status === 'error' && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
              {src.status === 'queued' && <span className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" />}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {src.country && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 border-slate-600">
                  {src.country}
                </Badge>
              )}
              <span>{src.headlineCount ?? 0} headlines</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}