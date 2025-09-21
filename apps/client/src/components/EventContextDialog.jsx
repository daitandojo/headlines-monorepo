// src/components/EventContextDialog.jsx (version 1.1)
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge
} from '@headlines/ui'
import { ExternalLink } from 'lucide-react'

const getRelevanceBadgeClass = (score) => {
  if (score >= 90) return 'bg-red-500/20 text-red-300 border border-red-500/30'
  if (score >= 75) return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
  return 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
}

export function EventContextDialog({ event, open, onOpenChange }) {
  if (!event) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-[95vw] bg-slate-900 border-slate-700 p-8">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <DialogTitle className="text-xl text-slate-100">
              Parent Event Context
            </DialogTitle>
            <Badge
              className={`text-base font-bold px-3 py-1 ${getRelevanceBadgeClass(event.highest_relevance_score)}`}
            >
              Score: {event.highest_relevance_score}
            </Badge>
          </div>
          <DialogDescription className="text-slate-400 text-base font-serif font-semibold">
            {event.synthesized_headline}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 max-h-[60vh] overflow-y-auto p-1 pr-6 custom-scrollbar">
          <div>
            <h4 className="font-semibold text-sm text-slate-300 mb-2">
              Synthesized Summary
            </h4>
            <div className="p-4 rounded-md bg-slate-800/50 border border-slate-700 text-sm text-slate-300">
              <p>{event.synthesized_summary}</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-300 mb-2">
              Corroborating Source Articles ({event.source_articles?.length || 0})
            </h4>
            <div className="space-y-2">
              {event.source_articles?.map((article, index) => (
                <a
                  key={index}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-4 p-3 rounded-md bg-slate-800/50 hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex-grow min-w-0">
                    <p className="font-medium text-slate-200 line-clamp-1 text-sm">
                      {article.headline}
                    </p>
                    <p className="text-xs text-slate-400">{article.newspaper}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-500 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
