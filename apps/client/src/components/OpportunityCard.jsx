// src/components/OpportunityCard.jsx (version 11.2)
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ExternalLink,
  User,
  Briefcase,
  MapPin,
  Trash2,
  Mail,
  Zap,
  MessageSquare,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SwipeToDelete } from './swipe/SwipeToDelete'
import { cn } from '@/lib/utils'
import { EventContextDialog } from './EventContextDialog'
import { DeletionConfirmationDialog } from './DeletionConfirmationDialog'
import useAppStore from '@/store/use-app-store'

export function OpportunityCard({ opportunity, onDelete, isDeleting }) {
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const skipConfirmation = useAppStore(
    (state) => state.deletePreferences.skipOpportunityConfirmation
  )

  const handleDelete = (e) => {
    if (e) e.preventDefault()
    onDelete()
  }

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    if (skipConfirmation) {
      handleDelete(e)
    } else {
      setIsDeleteDialogOpen(true)
    }
  }

  const sourceArticle = opportunity.sourceArticleId
  const sourceEvent = opportunity.sourceEventId
  const { contactDetails } = opportunity
  const isPremiumOpportunity = opportunity.likelyMMDollarWealth > 49

  const reasonsToContact = Array.isArray(opportunity.whyContact)
    ? opportunity.whyContact
    : [opportunity.whyContact]

  return (
    <>
      <Card
        className={cn(
          'bg-slate-900/50 border border-slate-700/80 transition-all duration-300 ease-out overflow-hidden',
          isDeleting ? 'opacity-50' : 'opacity-100',
          isPremiumOpportunity && 'card-glow impatient-wobble'
        )}
      >
        <SwipeToDelete onDelete={handleDelete}>
          <CardContent className="p-4 space-y-3 bg-slate-900/50 relative z-10">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 space-y-1">
                <p className="font-bold text-base text-slate-100 flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  {opportunity.reachOutTo}
                </p>
                {opportunity.basedIn && (
                  <p className="text-xs text-slate-400 flex items-center gap-2 pl-6">
                    <MapPin className="h-3 w-3" /> {opportunity.basedIn}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {opportunity.likelyMMDollarWealth > 0 && (
                  <Badge variant="outline" className="border-green-500/50 text-green-300">
                    ${opportunity.likelyMMDollarWealth}M
                  </Badge>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isDeleting || !sourceArticle?.link}
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(sourceArticle?.link, '_blank')
                        }}
                      >
                        <ExternalLink className="h-4 w-4 text-slate-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View Source Article</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isDeleting}
                        onClick={handleDeleteClick}
                      >
                        <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete Opportunity</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                {reasonsToContact.map((reason, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-sm text-slate-300 italic"
                  >
                    <MessageSquare className="h-4 w-4 mt-0.5 text-slate-500 flex-shrink-0" />
                    <p>“{reason}”</p>
                  </div>
                ))}
              </div>
            </div>

            {sourceEvent && (
              <div className="pt-3 mt-3 border-t border-slate-700/50">
                <Button
                  variant="ghost"
                  className="w-full h-auto text-left justify-start p-2 hover:bg-slate-800/50"
                  onClick={() => setIsEventDialogOpen(true)}
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
          </CardContent>
        </SwipeToDelete>
      </Card>

      {sourceEvent && (
        <EventContextDialog
          event={sourceEvent}
          open={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
        />
      )}
      <DeletionConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        isPending={isDeleting}
        itemType="opportunity"
        itemDescription={`for ${opportunity.reachOutTo}`}
        preferenceKey="skipOpportunityConfirmation"
      />
    </>
  )
}
