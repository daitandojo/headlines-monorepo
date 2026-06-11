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
import { AvatarWithFallback } from '@/components/shared/Avatar'
import Image from 'next/image'
import {
  Briefcase,
  MapPin,
  Mail,
  Zap,
  MessageSquare,
  ArrowRight,
  Trash2,
  Heart,
  Shield,
  Layers,
  TrendingUp,
  Globe,
} from 'lucide-react'
import { LinkedIndividualModal, ConnectionsRow } from './LinkedIndividualModal'
import { SwipeToDelete } from '../shared/SwipeToDelete'
import { cn, getCountryFlag } from '@headlines/utils-shared'
import { EventModal } from '../events/EventModal'
import { OutreachDraftModal } from './OutreachDraftModal'
import Link from 'next/link'
import useAppStore from '@/lib/store/use-app-store'
import { format } from 'date-fns'

const TRIGGER_CLASS_LABELS = {
  TC1_FAMILY_FOUNDER: { label: 'Family / Founder', color: 'text-amber-300 border-amber-500/50' },
  TC2_MA_BUYER: { label: 'M&A Buyer', color: 'text-blue-300 border-blue-500/50' },
  TC3_MA_SELLER: { label: 'M&A Seller', color: 'text-green-300 border-green-500/50' },
  TC4_PRIVATE_EQUITY: { label: 'Private Equity', color: 'text-purple-300 border-purple-500/50' },
  TC5_LISTED_COMPANY: { label: 'Listed Company', color: 'text-slate-400 border-slate-500/50' },
  TC6_REAL_ESTATE: { label: 'Real Estate', color: 'text-orange-300 border-orange-500/50' },
  TC7_PHILANTHROPY: { label: 'Philanthropy', color: 'text-pink-300 border-pink-500/50' },
  TC8_SUCCESSION: { label: 'Succession', color: 'text-teal-300 border-teal-500/50' },
  TC9_IPO: { label: 'IPO', color: 'text-cyan-300 border-cyan-500/50' },
  TC10_LUXURY_ASSET: { label: 'Luxury Asset', color: 'text-yellow-300 border-yellow-500/50' },
  TC11_RICH_LIST: { label: 'Rich List', color: 'text-indigo-300 border-indigo-500/50' },
  TC12_INDIVIDUAL_LIST: { label: 'Individual List', color: 'text-rose-300 border-rose-500/50' },
}

const LIQUIDITY_TYPE_LABELS = {
  exit_proceeds: 'Exit',
  dividend: 'Dividend',
  earnout: 'Earnout',
  fundraise: 'Fundraise',
  ipo_lockup: 'IPO Lockup',
  probate: 'Probate',
  succession: 'Succession',
  management_buyout: 'MBO',
  pe_exit: 'PE Exit',
  asset_sale: 'Asset Sale',
  other: 'Other',
}

const DossierQualityBadge = ({ quality }) => {
  const qualityMap = {
    gold: {
      icon: <Shield className="h-4 w-4 text-amber-300" />,
      tooltip: 'Gold Dossier: Comprehensive intelligence.',
    },
    silver: {
      icon: <Shield className="h-4 w-4 text-slate-300" />,
      tooltip: 'Silver Dossier: Key details.',
    },
    bronze: {
      icon: <Shield className="h-4 w-4 text-amber-800" />,
      tooltip: 'Bronze Dossier: Basic intelligence.',
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
  onShowSimilar,
  isFavorited,
}) {
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [linkedModalOpen, setLinkedModalOpen] = useState(false)
  const [selectedLink, setSelectedLink] = useState(null)

  const relatedIndividuals = opportunity.relatedIndividuals || []
  const skipConfirmation = useAppStore(
    (state) => state.deletePreferences.skipOpportunityConfirmation,
  )

  const handleDelete = () => {
    startTransition(() => onDelete(opportunity._id))
  }

  const { contactDetails, profile, liquidityEvent } = opportunity
  const totalNetWorth = profile?.estimatedNetWorthMM || 0
  const eventLiquidity = opportunity.lastKnownEventLiquidityMM || 0
  const isPremiumOpportunity = totalNetWorth > 49 || eventLiquidity > 49
  const basedInArray = Array.isArray(opportunity.basedIn)
    ? opportunity.basedIn
    : [opportunity.basedIn].filter(Boolean)
  const flags = basedInArray.map(getCountryFlag).join(' ')
  const hasEvents = opportunity.events && opportunity.events.length > 0
  const dossierQuality = profile?.dossierQuality || 'bronze'
  const triggerInfo = TRIGGER_CLASS_LABELS[opportunity.triggerClass]
  const liquidityType = liquidityEvent?.type || opportunity.liquidityEvent?.type
  const liquidityTypeLabel = LIQUIDITY_TYPE_LABELS[liquidityType]

  return (
    <>
      <Card
        className={cn(
          'bg-slate-900/50 border border-slate-700 transition-all duration-300 ease-out overflow-hidden hover:border-blue-500/50 hover:bg-slate-900',
          isPending ? 'opacity-50' : 'opacity-100',
          isPremiumOpportunity && 'card-glow',
          isFavorited && 'border-red-500/50',
        )}
      >
        <SwipeToDelete onDelete={() => setIsConfirmOpen(true)} onSwipeRight={() => onFavoriteToggle(opportunity._id, !isFavorited)}>
          <div className="p-4 space-y-3 bg-slate-900/50 relative z-10">
            <div className="flex justify-between items-start gap-3">
              <Link href={`/opportunities/${opportunity._id}`} className="block group flex-grow min-w-0">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <AvatarWithFallback
                      name={opportunity.reachOutTo}
                      imageUrl={profile?.profilePhotoUrl}
                      size={40}
                    />
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
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {(totalNetWorth > 0 || eventLiquidity > 0) && (
                      <Badge variant="outline" className="border-green-500/50 text-green-300">
                        ${totalNetWorth > 0 ? totalNetWorth : eventLiquidity}M
                      </Badge>
                    )}
                    {triggerInfo && (
                      <Badge variant="outline" className={cn('text-xs', triggerInfo.color)}>
                        {triggerInfo.label}
                      </Badge>
                    )}
                    {liquidityTypeLabel && (
                      <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                        {liquidityTypeLabel}
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
                        onClick={() => setIsDraftModalOpen(true)}
                        disabled={isPending}
                        className="h-8 w-8 text-slate-500 hover:bg-purple-500/10 hover:text-purple-400"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Draft Outreach Email</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onShowSimilar && onShowSimilar()}
                        disabled={isPending}
                        className="h-8 w-8 text-slate-500 hover:bg-teal-500/10 hover:text-teal-400"
                      >
                        <Layers className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Show Similar</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onFavoriteToggle(opportunity._id, !isFavorited)}
                        disabled={isPending}
                        className="h-8 w-8 text-slate-500 hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Heart className={cn('h-4 w-4', isFavorited && 'fill-current text-red-500')} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isPending}
                  className="h-8 w-8 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="pl-4 border-l-2 border-slate-700 space-y-2">
              <div className="text-sm text-slate-400 space-y-1">
                {contactDetails?.role && contactDetails?.company && (
                  <p className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span>{contactDetails.role} at <strong>{contactDetails.company}</strong></span>
                  </p>
                )}
                {contactDetails?.email && (
                  <a href={`mailto:${contactDetails.email}`} className="flex items-center gap-2 text-blue-400 hover:underline">
                    <Mail className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    {contactDetails.email}
                  </a>
                )}
                {profile?.wealthOrigin && (
                  <p className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span>Origin: <strong>{profile.wealthOrigin}</strong></span>
                  </p>
                )}
                {profile?.sector && (
                  <p className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span>Sector: <strong>{profile.sector}</strong></span>
                  </p>
                )}
              </div>

              {Array.isArray(opportunity.whyContact) && opportunity.whyContact[0] && (
                <div className="flex items-start gap-2 text-sm text-slate-300 italic">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-slate-500 flex-shrink-0" />
                  <p className="line-clamp-2">"{opportunity.whyContact[0]}"</p>
                </div>
              )}
            </div>

            {hasEvents && (
              <div className="pt-3 mt-3 border-t border-slate-700/50">
                <Button
                  variant="ghost"
                  className="w-full h-auto text-left justify-start p-2 hover:bg-slate-800/50"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEventModalOpen(true) }}
                >
                  <Zap className="h-4 w-4 mr-3 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">
                      {opportunity.events.length} Related Event{opportunity.events.length > 1 ? 's' : ''}:
                    </p>
                    <p className="text-sm text-slate-200 font-semibold truncate">
                      {opportunity.events[0]?.synthesized_headline}
                    </p>
                  </div>
                </Button>
              </div>
            )}

            {relatedIndividuals.length > 0 && (
              <ConnectionsRow
                individuals={relatedIndividuals}
                onViewDetails={(rel) => {
                  if (rel.linkedOppId) {
                    window.location.href = `/opportunities/${rel.linkedOppId}`
                  } else {
                    setSelectedLink(rel)
                    setLinkedModalOpen(true)
                  }
                }}
              />
            )}
          </div>
        </SwipeToDelete>
      </Card>

      {hasEvents && (
        <EventModal events={opportunity.events} open={isEventModalOpen} onOpenChange={setIsEventModalOpen} />
      )}
      <OutreachDraftModal opportunity={opportunity} open={isDraftModalOpen} onOpenChange={setIsDraftModalOpen} />
      <LinkedIndividualModal
        individuals={relatedIndividuals}
        open={linkedModalOpen}
        onOpenChange={setLinkedModalOpen}
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