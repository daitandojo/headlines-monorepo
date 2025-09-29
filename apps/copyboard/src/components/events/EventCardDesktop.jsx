// File: apps/copyboard/src/components/client/events/EventCardDesktop.jsx

'use client'

import {
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shared'
import { Trash2, MessageSquarePlus, Users } from 'lucide-react'
import { getCountryFlag } from '@headlines/utils-shared/next'
import Image from 'next/image'

const getRelevanceBadgeClass = (score) => {
  if (score >= 90)
    return 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-lg shadow-red-500/10'
  if (score >= 75)
    return 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10'
  return 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
}

export function EventCardDesktop({ event, onChat, onDelete, isPending }) {
  if (!event) return null
  const flag = getCountryFlag(event.country)
  const primaryImageUrl = event.source_articles?.find((a) => a.imageUrl)?.imageUrl

  return (
    <div className="hidden sm:block">
      <TooltipProvider delayDuration={100}>
        <div className="flex items-start gap-6">
          <div className="flex flex-col items-center shrink-0">
            <Badge
              className={`text-xl font-bold px-4 py-2 ${getRelevanceBadgeClass(
                event.highest_relevance_score
              )}`}
            >
              {event.highest_relevance_score}
            </Badge>
            <span className="text-xs text-slate-500 mt-1">Score</span>
          </div>
          <div className="flex-grow min-w-0 pr-20">
            <h3 className="font-serif font-bold text-xl text-slate-100 mb-2">
              <span className="text-2xl mr-3 align-middle">{flag}</span>
              {event.synthesized_headline}
            </h3>
            <p className="text-slate-300 leading-relaxed">{event.synthesized_summary}</p>
          </div>
          {primaryImageUrl && (
            <div className="relative h-24 w-24 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={primaryImageUrl}
                alt={event.synthesized_headline}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          )}
          <div className="absolute top-4 right-4 z-10 flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onChat}
                  className="text-slate-400 hover:text-blue-400 bg-black/20 hover:bg-blue-500/20 h-8 w-8"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ask AI about this event</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={onDelete}
                  className="text-slate-400 hover:text-red-400 bg-black/20 hover:bg-red-500/20 h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Event</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-800/50 flex flex-col sm:flex-row justify-between items-start gap-4">
          {event.key_individuals && event.key_individuals.length > 0 && (
            <div className="flex items-start gap-3 text-slate-400">
              <Users className="h-5 w-5 mt-0.5 shrink-0 text-slate-500" />
              <p className="text-sm font-medium text-slate-300">
                {event.key_individuals.length} Key Individual(s) Identified
              </p>
            </div>
          )}
          {event.ai_assessment_reason && (
            <p className="text-xs text-slate-500 italic sm:text-right flex-grow">
              {event.ai_assessment_reason}
            </p>
          )}
        </div>
      </TooltipProvider>
    </div>
  )
}
