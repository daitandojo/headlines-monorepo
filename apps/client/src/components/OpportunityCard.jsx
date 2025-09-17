// apps/client/src/components/OpportunityCard.jsx (version 15.3.0 - Flag Added)
'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@headlines/ui'
import { Button } from '@headlines/ui'
import {
  User,
  Briefcase,
  MapPin,
  Mail,
  Zap,
  MessageSquare,
  ArrowRight,
  Trash2,
} from 'lucide-react'
import { Badge } from '@headlines/ui'
import { SwipeToDelete } from './swipe/SwipeToDelete'
import { cn } from '@headlines/utils'
import { EventContextDialog } from './EventContextDialog'
import Link from 'next/link'
// DEFINITIVE FIX: Import the getCountryFlag utility
import { getCountryFlag } from '@headlines/utils'

export function OpportunityCard({ opportunity, onSwipeLeft, isDeleting }) {
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const performSwipe = () => {
    startTransition(() => {
      onSwipeLeft()
    })
  }

  const handleDelete = () => {
    performSwipe()
  }

  const sourceEvent = opportunity.sourceEventId
  const { contactDetails } = opportunity
  const isPremiumOpportunity = opportunity.likelyMMDollarWealth > 49
  const reasonsToContact = Array.isArray(opportunity.whyContact)
    ? opportunity.whyContact
    : [opportunity.whyContact]

  // DEFINITIVE FIX: Get the flag emoji for the opportunity's country
  const flag = getCountryFlag(opportunity.basedIn)

  return (
    <>
      <Card
        className={cn(
          'bg-slate-900/50 border border-slate-700 transition-all duration-300 ease-out overflow-hidden hover:border-blue-500/50 hover:bg-slate-900',
          isPending ? 'opacity-50' : 'opacity-100',
          isPremiumOpportunity && 'card-glow impatient-wobble'
        )}
      >
        <SwipeToDelete onSwipeLeft={handleDelete}>
          <div className="p-4 space-y-3 bg-slate-900/50 relative z-10">
            <div className="flex justify-between items-start gap-3">
              <Link
                href={`/opportunities/${opportunity._id}`}
                className="block group flex-grow min-w-0"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-base text-slate-100 flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      {opportunity.reachOutTo}
                    </p>
                    {/* DEFINITIVE FIX: Add the flag emoji before the location text */}
                    {(opportunity.city || opportunity.basedIn) && (
                      <p className="text-xs text-slate-400 flex items-center gap-2 pl-6">
                        <MapPin className="h-3 w-3" />
                        <span className="text-base mr-1">{flag}</span>
                        {opportunity.city}
                        {opportunity.city && opportunity.basedIn ? ', ' : ''}
                        {opportunity.basedIn}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {opportunity.likelyMMDollarWealth > 0 && (
                      <Badge
                        variant="outline"
                        className="border-green-500/50 text-green-300"
                      >
                        ${opportunity.likelyMMDollarWealth}M
                      </Badge>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-5 w-5 text-blue-400" />
                    </div>
                  </div>
                </div>
              </Link>
              <div className="flex-shrink-0 hidden sm:block">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
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
              </div>
              <div className="space-y-2">
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

            {sourceEvent && (
              <div className="pt-3 mt-3 border-t border-slate-700/50">
                <Button
                  variant="ghost"
                  className="w-full h-auto text-left justify-start p-2 hover:bg-slate-800/50"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsEventDialogOpen(true)
                  }}
                >
                  <Zap className="h-4 w-4 mr-3 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">View Parent Event:</p>
                    <p className="text-sm font-semibold text-slate-200 truncate">
                      {sourceEvent.synthesized_headline}
                    </p>
                  </div>
                </Button>
              </div>
            )}
          </div>
        </SwipeToDelete>
      </Card>
      {sourceEvent && (
        <EventContextDialog
          event={sourceEvent}
          open={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
        />
      )}
    </>
  )
}
