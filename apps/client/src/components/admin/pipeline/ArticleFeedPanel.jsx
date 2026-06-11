// apps/client/src/components/admin/pipeline/ArticleFeedPanel.jsx
'use client'

import { Badge } from '@/components/shared'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText } from 'lucide-react'

function ScoreBar({ score }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-slate-500'
  return (
    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
    </div>
  )
}

export function ArticleFeedPanel({ articles = [] }) {
  const recent = articles.slice(-30).reverse()

  if (recent.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm italic">
        <div className="text-center">
          <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p>Waiting for articles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5 p-2 overflow-y-auto max-h-full">
      <AnimatePresence initial={false}>
        {recent.map((a, i) => (
          <motion.div
            key={a.id || i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-slate-200 leading-tight line-clamp-2 flex-1">
                {a.headline || 'No headline'}
              </p>
              <span className={`text-xs font-bold shrink-0 ${
                a.score >= 80 ? 'text-green-400' : a.score >= 60 ? 'text-yellow-400' : 'text-slate-400'
              }`}>
                {a.score}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <ScoreBar score={a.score} />
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
              <span>{a.source || '?'}</span>
              {a.country && <Badge variant="outline" className="text-[10px] px-1 py-0 border-slate-600">{a.country}</Badge>}
              {a.assessment && <span className="truncate">{a.assessment}</span>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}