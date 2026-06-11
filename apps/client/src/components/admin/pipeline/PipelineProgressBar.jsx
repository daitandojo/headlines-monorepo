// apps/client/src/components/admin/pipeline/PipelineProgressBar.jsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

const DEFAULT_STAGES = [
  'preflight', 'scrape', 'assess', 'entityResolution',
  'synthesize', 'opportunityDeepDive', 'intelligenceEnrichment',
  'commit', 'knowledgeGraph', 'watchlist',
]

const STAGE_LABELS = {
  preflight: 'Preflight',
  scrape: 'Scrape',
  assess: 'Headline Assess',
  entityResolution: 'Entity Resolution',
  synthesize: 'Synthesize',
  opportunityDeepDive: 'Deep Dive',
  intelligenceEnrichment: 'Intelligence',
  commit: 'Commit & Notify',
  knowledgeGraph: 'Knowledge Graph',
  watchlist: 'Watchlist',
}

export function PipelineProgressBar({ activeStage, completedStages = [] }) {
  const isAfter = (stage) => {
    const idx = DEFAULT_STAGES.indexOf(stage)
    const activeIdx = DEFAULT_STAGES.indexOf(activeStage)
    return activeIdx >= 0 && idx >= 0 && idx > activeIdx
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2 px-1">
      {DEFAULT_STAGES.map((stage, i) => {
        const isComplete = completedStages.includes(stage)
        const isCurrent = stage === activeStage
        const isPending = !isComplete && !isCurrent && isAfter(stage)

        return (
          <div key={stage} className="flex items-center gap-1 min-w-0">
            <motion.div
              layout
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                isComplete
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : isCurrent
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm shadow-blue-500/20'
                  : isPending
                  ? 'bg-slate-800/50 text-slate-500 border border-slate-700/50'
                  : 'bg-slate-800/50 text-slate-500 border border-slate-700/50'
              }`}
              animate={isCurrent ? { scale: [1, 1.02, 1] } : {}}
              transition={isCurrent ? { repeat: Infinity, duration: 2 } : {}}
            >
              {isComplete && <CheckCircle2 className="w-3 h-3 text-green-400" />}
              {isCurrent && <Loader2 className="w-3 h-3 text-blue-300 animate-spin" />}
              {(isPending || (!isComplete && !isCurrent)) && (
                <span className="w-3 h-3 rounded-full border border-slate-600" />
              )}
              <span>{STAGE_LABELS[stage] || stage}</span>
            </motion.div>
            {i < DEFAULT_STAGES.length - 1 && (
              <div className={`w-3 h-px ${isComplete ? 'bg-green-500/40' : 'bg-slate-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export { DEFAULT_STAGES }