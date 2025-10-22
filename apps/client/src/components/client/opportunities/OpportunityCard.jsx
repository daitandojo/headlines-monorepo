// apps/client/src/components/client/opportunities/OpportunityCard.jsx
'use client'

import { useState, useTransition } from 'react'
import {
  Card,
  Button,
  Badge,
  ConfirmationDialog,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/shared'
import Image from 'next/image'
import {
  User,
  Briefcase,
  MapPin,
  Mail,
  Zap,
  MessageSquare,
  ArrowRight,
  Trash2,
  BookOpen,
  Heart,
  Shield,
  Layers, // ADDED ICON
} from 'lucide-react'
import { SwipeToDelete } from '../shared/SwipeToDelete'
import { cn, getCountryFlag } from '@headlines/utils-shared'
import { EventModal } from '../events/EventModal'
import { OutreachDraftModal } from './OutreachDraftModal'
import Link from 'next/link'
import useAppStore from '@/lib/store/use-app-store'
import { format } from 'date-fns'

const DossierQualityBadge = ({ quality }) => {
  const qualityMap = {
    gold: {
      icon: <Shield className="h-4 w-4 text-amber-300" />,
      tooltip: 'Gold Dossier: Comprehensive intelligence available.',
    },
    silver: {
      icon: <Shield className="h-4 w-4 text-slate-300" />,
      tooltip: 'Silver Dossier: Key details available.',
    },
    bronze: {
      icon: <Shield className="h-4 w-4 text-amber-800" />,
      tooltip: 'Bronze Dossier: Basic intelligence available.',
    },
  }
  const { icon, tooltip } = qualityMap[quality] || qualityMap.bronze
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{icon}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function OpportunityCard({
  opportunity,
  onDelete,
  onFavoriteToggle,
  onShowSimilar, // ADDED PROP
  isFavorited,
}) {
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const skipConfirmation = useAppStore(
    (state) => state.deletePreferences.skipOpportunityConfirmation
  )

  const handleDelete = () => {
    startTransition(() => {
      onDelete(opportunity._id)
    })
  }
  const handleDeleteRequest = () => {
    if (skipConfirmation) {
      handleDelete()
    } else {
      setIsConfirmOpen(true)
    }
  }

  const handleFavoriteClick = (e) => {
    e.stopPropagation()
    onFavoriteToggle(opportunity._id, !isFavorited)
  }
  const handleSwipeRight = () => {
    onFavoriteToggle(opportunity._id, !isFavorited)
  }

  const handleDraftClick = (e) => {
    e.stopPropagation()
    setIsDraftModalOpen(true)
  }

  const handleShowSimilar = (e) => {
    // ADDED HANDLER
    e.stopPropagation()
    if (onShowSimilar) onShowSimilar()
  }

  const hasEvents = opportunity.events && opportunity.events.length > 0
  const { contactDetails, profile } = opportunity
  const totalNetWorth = profile?.estimatedNetWorthMM || 0
  const eventLiquidity = opportunity.lastKnownEventLiquidityMM || 0
  const isPremiumOpportunity = totalNetWorth > 49 || eventLiquidity > 49
  const reasonsToContact = Array.isArray(opportunity.whyContact)
    ? opportunity.whyContact
    : [opportunity.whyContact]
  const basedInArray = Array.isArray(opportunity.basedIn)
    ? opportunity.basedIn
    : [opportunity.basedIn].filter(Boolean)
  const flags = basedInArray.map(getCountryFlag).join(' ')
  const mostRecentEventDate = hasEvents ? new Date(opportunity.events[0].createdAt) : null
  const dossierQuality = profile?.dossierQuality || 'bronze'

  return (
    <>
      <Card
        className={cn(
          'bg-slate-900/50 border border-slate-700 transition-all duration-300 ease-out overflow-hidden hover:border-blue-500/50 hover:bg-slate-900',
          isPending ? 'opacity-50' : 'opacity-100',
          isPremiumOpportunity && 'card-glow',
          isFavorited && 'border-red-500/50'
        )}
      >
        <SwipeToDelete onDelete={handleDeleteRequest} onSwipeRight={handleSwipeRight}>
          <div className="p-4 space-y-3 bg-slate-900/50 relative z-10">
            <div className="flex justify-between items-start gap-3">
              <Link
                href={`/opportunities/${opportunity._id}`}
                className="block group flex-grow min-w-0"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    {profile?.profilePhotoUrl ? (
                      <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={profile.profilePhotoUrl}
                          alt={opportunity.reachOutTo}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="font-bold text-base text-slate-100 truncate group-hover:text-blue-400 transition-colors flex items-center gap-2">
                        <DossierQualityBadge quality={dossierQuality} />
                        {opportunity.reachOutTo}
                      </p>
                      <div className="text-xs text-slate-400 flex items-center gap-2 truncate">
                        <MapPin className="h-3 w-3" />
                        <span className="text-base mr-1">{flags}</span>
                        {basedInArray.join(', ')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(totalNetWorth > 0 || eventLiquidity > 0) && (
                      <Badge
                        variant="outline"
                        className="border-green-500/50 text-green-300"
                      >
                        ${totalNetWorth > 0 ? totalNetWorth : eventLiquidity}M
                      </Badge>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-5 w-5 text-blue-400" />
                    </div>
                  </div>
                </div>
              </Link>
              <div className="flex-shrink-0 flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDraftClick}
                        disabled={isPending}
                        className="h-8 w-8 text-slate-500 hover:bg-purple-500/10 hover:text-purple-400"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Draft Outreach Email</p>
                    </TooltipContent>
                  </Tooltip>
                  {/* --- START OF MODIFICATION --- */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleShowSimilar}
                        disabled={isPending}
                        className="h-8 w-8 text-slate-500 hover:bg-teal-500/10 hover:text-teal-400"
                      >
                        <Layers className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Show Similar Opportunities</p>
                    </TooltipContent>
                  </Tooltip>
                  {/* --- END OF MODIFICATION --- */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleFavoriteClick}
                        disabled={isPending}
                        className="h-8 w-8 text-slate-500 hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Heart
                          className={cn(
                            'h-4 w-4',
                            isFavorited && 'fill-current text-red-500'
                          )}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteRequest}
                  disabled={isPending}
                  className="h-8 w-8 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="pl-4 border-l-2 border-slate-700 space-y-3">
              <div className="text-sm text-slate-400 space-y-1">
                {contactDetails?.role && contactDetails?.company && (
                  <p className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span>
                      {contactDetails.role} at <strong>{contactDetails.company}</strong>
                    </span>
                  </p>
                )}
                {contactDetails?.email && (
                  <a
                    href={`mailto:${contactDetails.email}`}
                    className="flex items-center gap-2 text-blue-400 hover:underline"
                  >
                    <Mail className="h-4 w-4 text-slate-500 flex-shrink-0" />{' '}
                    {contactDetails.email}
                  </a>
                )}
                {profile?.wealthOrigin && (
                  <p className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span>
                      Wealth Origin: <strong>{profile.wealthOrigin}</strong>
                    </span>
                  </p>
                )}
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-800">
                {reasonsToContact.slice(0, 1).map((reason, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-sm text-slate-300 italic"
                  >
                    <MessageSquare className="h-4 w-4 mt-0.5 text-slate-500 flex-shrink-0" />
                    <p className="line-clamp-2">“{reason}”</p>
                  </div>
                ))}
              </div>
            </div>
            {hasEvents && (
              <div className="pt-3 mt-3 border-t border-slate-700/50">
                <Button
                  variant="ghost"
                  className="w-full h-auto text-left justify-start p-2 hover:bg-slate-800/50"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsEventModalOpen(true)
                  }}
                >
                  <Zap className="h-4 w-4 mr-3 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">
                      View {opportunity.events.length} Related Event
                      {opportunity.events.length > 1 ? 's' : ''}:
                    </p>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      {mostRecentEventDate && (
                        <span className="text-slate-500 font-medium whitespace-nowrap">
                          {format(mostRecentEventDate, 'd MMM yyyy')} -
                        </span>
                      )}
                      <span className="text-slate-200 font-semibold truncate">
                        {opportunity.events[0].synthesized_headline}
                      </span>
                    </div>
                  </div>
                </Button>
              </div>
            )}
          </div>
        </SwipeToDelete>
      </Card>
      {hasEvents && (
        <EventModal
          events={opportunity.events}
          open={isEventModalOpen}
          onOpenChange={setIsEventModalOpen}
        />
      )}
      <OutreachDraftModal
        opportunity={opportunity}
        open={isDraftModalOpen}
        onOpenChange={setIsDraftModalOpen}
      />
      <ConfirmationDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleDelete}
        isPending={isPending}
        itemType="opportunity"
        itemDescription={opportunity.reachOutTo}
        preferenceKey="skipOpportunityConfirmation"
      />
    </>
  )
}
