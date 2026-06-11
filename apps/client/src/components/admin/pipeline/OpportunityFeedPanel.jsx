// apps/client/src/components/admin/pipeline/OpportunityFeedPanel.jsx
'use client'

import { Badge } from '@/components/shared'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, DollarSign } from 'lucide-react'

const PRIORITY_COLORS = {
  high: 'bg-green-500/20 text-green-300',
  medium: 'bg-yellow-500/20 text-yellow-300',
  low: 'bg-slate-500/20 text-slate-400',
}

export function OpportunityFeedPanel({ opportunities = [] }) {
  const recent = opportunities.slice(-10).reverse()

  if (recent.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm italic">
        <div className="text-center">
          <Target className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p>Waiting for opportunities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5 p-2 overflow-y-auto max-h-full">
      <AnimatePresence initial={false}>
        {recent.map((o, i) => (
          <motion.div
            key={o.id || i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200">{o.name || 'Unknown'}</span>
              {o.netWorth && (
                <span className="text-xs text-amber-400 flex items-center gap-0.5">
                  <DollarSign className="w-2.5 h-2.5" />{o.netWorth}M
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {o.triggerClass && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                  {o.triggerClass}
                </span>
              )}
              {o.priority && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[o.priority] || 'bg-slate-700 text-slate-300'}`}>
                  {o.priority}
                </span>
              )}
              {o.whyContact && (
                <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{o.whyContact}</span>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}