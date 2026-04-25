// apps/client/src/components/client/opportunities/LinkedIndividualModal.jsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Badge,
} from '@/components/shared'
import { User, MapPin, TrendingUp, Globe, Phone, Mail } from 'lucide-react'
import { getCountryFlag } from '@headlines/utils-shared'
import Link from 'next/link'

export function LinkedIndividualModal({ individuals = [], open, onOpenChange }) {
  if (!individuals || individuals.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[70vh] flex flex-col bg-slate-900 border-slate-700">
        <DialogHeader className="p-4 border-b border-slate-700">
          <DialogTitle className="text-lg text-slate-100 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-400" />
            Connections
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-grow">
          <div className="divide-y divide-slate-800">
            {individuals.map((rel, i) => (
              <Link key={i} href={`/opportunities/${rel.linkedOppId}`} legacyBehavior>
                <a className="block p-4 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-100 truncate">{rel.name}</p>
                        <p className="text-xs text-slate-400">
                          {rel.relationship || rel.type || 'Connected'}
                          {rel.company && ` — ${rel.company}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs text-slate-400 border-slate-600 shrink-0">
                      View
                    </Badge>
                  </div>
                  {rel.notes && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{rel.notes}</p>
                  )}
                </a>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export function ConnectionsRow({ individuals = [], onViewDetails }) {
  if (!individuals || individuals.length === 0) return null

  const display = individuals.slice(0, 3)
  const remaining = individuals.length - display.length

  return (
    <div className="pt-2 mt-2 border-t border-slate-700/50">
      <p className="text-xs text-slate-500 mb-2">Connections:</p>
      <div className="flex flex-wrap gap-2">
        {display.map((rel, i) => (
          <button
            key={i}
            onClick={() => onViewDetails && onViewDetails(rel)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
          >
            <User className="h-3 w-3 text-slate-500" />
            <span className="font-medium">{rel.name}</span>
            {rel.relationship && (
              <span className="text-slate-500">({rel.relationship})</span>
            )}
          </button>
        ))}
        {remaining > 0 && (
          <span className="px-2.5 py-1 text-xs text-slate-500">+{remaining} more</span>
        )}
      </div>
    </div>
  )
}