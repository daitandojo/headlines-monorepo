// apps/client/src/components/admin/pipeline/EventDealPanel.jsx
'use client'

import { Badge } from '@/components/shared'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, DollarSign } from 'lucide-react'

const TRIGGER_COLORS = {
  TC1: 'bg-purple-500/20 text-purple-300', TC2: 'bg-blue-500/20 text-blue-300',
  TC3: 'bg-orange-500/20 text-orange-300', TC4: 'bg-pink-500/20 text-pink-300',
  TC5: 'bg-green-500/20 text-green-300', TC6: 'bg-yellow-500/20 text-yellow-300',
  TC7: 'bg-indigo-500/20 text-indigo-300', TC8: 'bg-red-500/20 text-red-300',
  TC9: 'bg-cyan-500/20 text-cyan-300', TC10: 'bg-emerald-500/20 text-emerald-300',
}

const DEAL_COLORS = {
  rumor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  announced: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  pending: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  completed: 'bg-green-500/20 text-green-300 border-green-500/30',
  cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

export function EventDealPanel({ events = [] }) {
  const recent = events.slice(-15).reverse()

  if (recent.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm italic">
        <div className="text-center">
          <Zap className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p>Waiting for events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5 p-2 overflow-y-auto max-h-full">
      <AnimatePresence initial={false}>
        {recent.map((e, i) => (
          <motion.div
            key={e.id || i}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`rounded-lg border p-2.5 ${
              e.dealStatus && DEAL_COLORS[e.dealStatus]
                ? DEAL_COLORS[e.dealStatus].replace(/text-\w+/, 'text-slate-200')
                : 'bg-slate-800/50 border-slate-700/50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-slate-200 leading-tight line-clamp-2 flex-1">
                {e.headline || 'No headline'}
              </p>
              <span className={`text-xs font-bold shrink-0 ${
                e.score >= 80 ? 'text-green-400' : e.score >= 60 ? 'text-yellow-400' : 'text-slate-400'
              }`}>
                {e.score}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {e.triggerClass && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${TRIGGER_COLORS[e.triggerClass] || 'bg-slate-700 text-slate-300'}`}>
                  {e.triggerClass}
                </span>
              )}
              {e.dealStatus && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${DEAL_COLORS[e.dealStatus] || 'bg-slate-700 text-slate-300'}`}>
                  {e.dealStatus}
                </span>
              )}
              {e.amount && (
                <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                  <DollarSign className="w-2.5 h-2.5" />{e.amount}M
                </span>
              )}
              {e.country && (
                <span className="text-[10px] text-slate-500">{e.country}</span>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}