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
import {
  Trash2,
  MessageSquarePlus,
  Users,
  AlertCircle,
  Loader2,
  FileText,
  TrendingUp,
  Heart,
  Layers, // ADDED ICON
} from 'lucide-react'
import { getCountryFlag } from '@headlines/utils-shared'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { useState, useMemo } from 'react'
import { cn } from '@headlines/utils-shared'

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
  onFavorite,
  onShowArticles,
  onShowOpportunities,
  onShowSimilar, // ADDED PROP
  isOpportunitiesLoading,
  isFavorited,
  isPending = false,
}) {
  const [imageError, setImageError] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const computedData = useMemo(() => {
    if (!event) return null
    const countryArray = Array.isArray(event.country)
      ? event.country
      : [event.country].filter(Boolean)
    const flags = countryArray.map(getCountryFlag).join(' ')
    const primaryImageUrl = event.source_articles?.find((a) => a?.imageUrl)?.imageUrl
    const updatedAt = event.updatedAt
      ? formatDistanceToNow(new Date(event.updatedAt), { addSuffix: true })
      : 'Recently'
    const relevanceScore = event.highest_relevance_score ?? 0
    const opportunityCount = event.key_individuals?.length || 0
    const valuation = event.transactionDetails?.valuationAtEventUSD
    const tags = event.tags || []
    return {
      flags,
      primaryImageUrl,
      updatedAt,
      relevanceScore,
      opportunityCount,
      valuation,
      tags,
    }
  }, [event])

  if (!event) return null

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

  const handleShowSimilar = (e) => {
    // ADDED HANDLER
    e.stopPropagation()
    if (onShowSimilar && !isPending && !isDeleting) onShowSimilar(e)
  }

  const handleChat = (e) => {
    e.stopPropagation()
    if (onChat && !isPending && !isDeleting) onChat(e)
  }

  const {
    flags,
    primaryImageUrl,
    updatedAt,
    relevanceScore,
    opportunityCount,
    valuation,
    tags,
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
                    className={`text-xl font-bold px-3 py-1.5 transition-all duration-200 ${getRelevanceBadgeClass(relevanceScore)}`}
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onFavorite}
                    disabled={isPending || isDeleting}
                    className="text-slate-500 hover:text-red-500 mt-2 h-8 w-8"
                    aria-label="Favorite"
                  >
                    <Heart
                      className={cn(
                        'h-5 w-5',
                        isFavorited && 'fill-current text-red-500'
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex-grow min-w-0">
              <h3 className="font-serif font-bold text-xl text-slate-100 mb-2 leading-tight transition-colors duration-200 group-hover:text-white">
                {flags && <span className="text-2xl mr-3 align-middle">{flags}</span>}
                {event.synthesized_headline || 'Untitled Event'}
              </h3>
              <p className="text-slate-300 leading-relaxed text-[15px] line-clamp-3">
                {event.synthesized_summary || 'No summary available.'}
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs font-medium text-slate-400">
                {valuation && (
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                    <span>Valuation: ${valuation}M</span>
                  </div>
                )}
                {tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="capitalize">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
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
              {/* --- START OF MODIFICATION --- */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShowSimilar}
                    disabled={isPending || isDeleting}
                    className="text-slate-400 hover:text-teal-400 bg-slate-900/80 hover:bg-teal-500/20 h-8 w-8 backdrop-blur-sm"
                    aria-label="Show Similar"
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Show Similar Events</p>
                </TooltipContent>
              </Tooltip>
              {/* --- END OF MODIFICATION --- */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleChat}
                    disabled={isPending || isDeleting}
                    className="text-slate-400 hover:text-blue-400 bg-slate-900/80 hover:bg-blue-500/20 h-8 w-8 backdrop-blur-sm"
                    aria-label="Ask AI"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ask AI about this event</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending || isDeleting}
                    onClick={handleDelete}
                    className="text-slate-400 hover:text-red-400 bg-slate-900/80 hover:bg-red-500/20 h-8 w-8 backdrop-blur-sm"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete Event</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-3">
            <Button
              variant="ghost"
              className="p-0 h-auto text-left hover:bg-transparent"
              disabled={isPending || isDeleting || isOpportunitiesLoading}
            >
              <div className="flex items-center gap-4 group/btn">
                {opportunityCount > 0 && (
                  <>
                    <div
                      className="flex items-center gap-2.5 cursor-pointer"
                      onClick={(e) => onShowOpportunities && onShowOpportunities(e)}
                    >
                      <div className="p-1.5 rounded bg-green-500/10 group-hover/btn:bg-green-500/20 transition-all duration-200">
                        {isOpportunitiesLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Users className="h-4 w-4 text-green-400" />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-green-300 group-hover/btn:text-green-200 transition-colors duration-200">
                        {opportunityCount} Opportunit{opportunityCount > 1 ? 'ies' : 'y'}
                      </p>
                    </div>
                    <div className="h-6 w-px bg-slate-700/50" />
                  </>
                )}
                <div
                  className="flex items-center gap-2.5 cursor-pointer"
                  onClick={(e) => onShowArticles && onShowArticles(e)}
                >
                  <div className="p-1.5 rounded bg-slate-800/50 group-hover/btn:bg-slate-700/50 transition-all duration-200">
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300 group-hover/btn:text-slate-200 transition-colors duration-200">
                    {event.source_articles?.length || 0} Source Article
                    {event.source_articles?.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </Button>
            {event.advisorSummary && (
              <div className="flex items-start gap-2 sm:text-right flex-grow">
                <div className="p-1 rounded bg-slate-800/30 shrink-0 sm:order-2">
                  <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <p className="text-xs text-slate-500 italic leading-relaxed sm:order-1">
                  {event.advisorSummary}
                </p>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    </div>
  )
}
