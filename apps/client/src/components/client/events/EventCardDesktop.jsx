// apps/client/src/components/client/events/EventCardDesktop.jsx
'use client'

import {
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shared'
import { Trash2, MessageSquarePlus, Users, AlertCircle, Loader2 } from 'lucide-react'
import { getCountryFlag } from '@headlines/utils-shared'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { useState, useMemo } from 'react'

const getRelevanceBadgeClass = (score) => {
  const numScore = Number(score)
  if (isNaN(numScore)) return 'bg-slate-600 text-white'

  if (numScore >= 90)
    return 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30'
  if (numScore >= 75)
    return 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
  return 'bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-md'
}

const getRelevanceLabel = (score) => {
  const numScore = Number(score)
  if (isNaN(numScore)) return 'Unknown'
  if (numScore >= 90) return 'Critical'
  if (numScore >= 75) return 'High Priority'
  return 'Standard'
}

export function EventCardDesktop({
  event,
  onChat,
  onDelete,
  onShowIndividuals,
  onShowOpportunities,
  isOpportunitiesLoading,
  isPending = false,
}) {
  const [imageError, setImageError] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const computedData = useMemo(() => {
    if (!event) return null

    const flags = Array.isArray(event.country)
      ? event.country.map((c) => getCountryFlag(c)).join(' ')
      : ''

    const primaryImageUrl = Array.isArray(event.source_articles)
      ? event.source_articles.find((a) => a?.imageUrl)?.imageUrl
      : null

    const updatedAt = event.updatedAt
      ? formatDistanceToNow(new Date(event.updatedAt), { addSuffix: true })
      : 'Recently'

    const relevanceScore = event.highest_relevance_score ?? 0
    const individualCount = Array.isArray(event.key_individuals)
      ? event.key_individuals.length
      : 0

    const opportunityCount = event.relatedOpportunities?.length || 0

    return {
      flags,
      primaryImageUrl,
      updatedAt,
      relevanceScore,
      individualCount,
      opportunityCount,
    }
  }, [event])

  if (!event) {
    return (
      <div className="hidden sm:flex items-center gap-3 p-4 rounded-lg bg-slate-800/30">
        <AlertCircle className="h-5 w-5 text-slate-500" />
        <span className="text-sm text-slate-400">Event data unavailable</span>
      </div>
    )
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!onDelete || isDeleting) return
    setIsDeleting(true)
    try {
      await onDelete()
    } finally {
      setIsDeleting(false)
    }
  }

  const handleChat = (e) => {
    e.stopPropagation()
    if (onChat && !isPending && !isDeleting) {
      onChat(e)
    }
  }

  const handleShowContent = (e) => {
    e.stopPropagation()
    if (isPending || isDeleting || isOpportunitiesLoading) return

    if (computedData.opportunityCount > 0 && onShowOpportunities) {
      onShowOpportunities(e)
    } else if (onShowIndividuals) {
      onShowIndividuals(e)
    }
  }

  const {
    flags,
    primaryImageUrl,
    updatedAt,
    relevanceScore,
    individualCount,
    opportunityCount,
  } = computedData

  return (
    <div className="hidden sm:block group">
      <TooltipProvider delayDuration={100}>
        <div className="relative p-4 rounded-lg bg-slate-800/40 transition-all duration-300 hover:bg-slate-800/60 hover:shadow-xl hover:shadow-slate-900/30">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center shrink-0 min-w-[70px]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className={`text-xl font-bold px-3 py-1.5 transition-all duration-200 ${getRelevanceBadgeClass(
                      relevanceScore
                    )}`}
                  >
                    {relevanceScore}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center">
                    <p className="font-semibold">{getRelevanceLabel(relevanceScore)}</p>
                    <p className="text-xs text-slate-400">Relevance Score</p>
                  </div>
                </TooltipContent>
              </Tooltip>
              <span className="text-xs text-slate-500 mt-1.5 font-medium">
                {updatedAt}
              </span>
            </div>

            <div className="flex-grow min-w-0 pr-4">
              <h3 className="font-serif font-bold text-xl text-slate-100 mb-2 leading-tight transition-colors duration-200 group-hover:text-white">
                {flags && <span className="text-2xl mr-3 align-middle">{flags}</span>}
                {event.synthesized_headline || 'Untitled Event'}
              </h3>
              <p className="text-slate-300 leading-relaxed text-[15px] line-clamp-3">
                {event.synthesized_summary || 'No summary available.'}
              </p>
            </div>

            {primaryImageUrl && !imageError && (
              <div className="relative h-24 w-24 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-300 group-hover:shadow-lg">
                <Image
                  src={primaryImageUrl}
                  alt={event.synthesized_headline || 'Event image'}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="96px"
                  onError={() => setImageError(true)}
                  loading="lazy"
                />
              </div>
            )}

            <div className="absolute top-3 right-3 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleChat}
                    disabled={isPending || isDeleting}
                    className="text-slate-400 hover:text-blue-400 bg-slate-900/80 hover:bg-blue-500/20 h-8 w-8 backdrop-blur-sm transition-all duration-200 disabled:opacity-50"
                    aria-label="Ask AI about this event"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">Ask AI about this event</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending || isDeleting}
                    onClick={handleDelete}
                    className="text-slate-400 hover:text-red-400 bg-slate-900/80 hover:bg-red-500/20 h-8 w-8 backdrop-blur-sm transition-all duration-200 disabled:opacity-50"
                    aria-label="Delete event"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">Delete Event</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-col sm:flex-row justify-between items-start gap-3">
            {(individualCount > 0 || opportunityCount > 0) && (
              <Button
                variant="ghost"
                className="p-0 h-auto text-left hover:bg-transparent transition-colors duration-200"
                onClick={handleShowContent}
                disabled={isPending || isDeleting || isOpportunitiesLoading}
                aria-label={`View related individuals and opportunities`}
              >
                <div className="flex items-center gap-2.5 group/btn">
                  <div className="p-1.5 rounded bg-slate-800/50 group-hover/btn:bg-slate-700/50 transition-all duration-200">
                    {isOpportunitiesLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4 text-slate-400 group-hover/btn:text-slate-300" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300 group-hover/btn:text-slate-200 transition-colors duration-200">
                      {opportunityCount > 0
                        ? `${opportunityCount} Actionable Opportunit${opportunityCount > 1 ? 'ies' : 'y'} Identified`
                        : `${individualCount} Key Individual${individualCount !== 1 ? 's' : ''} Identified`}
                    </p>
                    <p className="text-xs text-slate-500">Click to view details</p>
                  </div>
                </div>
              </Button>
            )}

            {event.ai_assessment_reason && (
              <div className="flex items-start gap-2 sm:text-right flex-grow">
                <div className="p-1 rounded bg-slate-800/30 shrink-0 sm:order-2">
                  <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <p className="text-xs text-slate-500 italic leading-relaxed sm:order-1">
                  {event.ai_assessment_reason}
                </p>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    </div>
  )
}
