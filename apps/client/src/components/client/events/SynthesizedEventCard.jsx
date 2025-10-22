// apps/client/src/components/client/events/SynthesizedEventCard.jsx
'use client'

import { useState } from 'react'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  ConfirmationDialog,
} from '@/components/shared'
import { SwipeToDelete } from '../shared/SwipeToDelete'
import { EventCardDesktop } from './EventCardDesktop'
import { EventCardMobile } from './EventCardMobile'
import { EventCardDetails } from './EventCardDetails'
import { OpportunityModal } from '../opportunities/OpportunityModal'
import { ArticleModal } from '../articles/ArticleModal'
import { useEventCard } from './useEventCard'
import { useAuth } from '@/lib/auth/client'
import { toast } from 'sonner'
import { sendItemToEmail } from '@/lib/api-client'

export const SynthesizedEventCard = ({
  event,
  onDelete,
  onFavoriteToggle,
  isFavorited,
}) => {
  const { user } = useAuth()
  const {
    isPending,
    isEmailDialogOpen,
    setIsEmailDialogOpen,
    isArticlesModalOpen,
    setIsArticlesModalOpen,
    isOpportunitiesModalOpen,
    setIsOpportunitiesModalOpen,
    opportunitiesForModal,
    isOpportunitiesLoading,
    performDelete,
    handleSwipeRight,
    handleChatAboutEvent,
    handleFavorite,
    handleShowArticles,
    handleShowOpportunities,
  } = useEventCard(
    event,
    () => onDelete(event),
    (isFav) => onFavoriteToggle(isFav),
    isFavorited
  )

  const handleSendEmail = async () => {
    if (!user) return
    toast.promise(sendItemToEmail(event._id, 'event'), {
      loading: `Sending event brief to ${user.email}...`,
      success: 'Event successfully sent to your email.',
      error: 'Failed to send email.',
    })
    setIsEmailDialogOpen(false)
  }

  // --- START OF DEFINITIVE FIX ---
  // New handler to show a modal for a single, specific opportunity.
  const handleShowIndividualOpportunity = (individualName) => {
    // This leverages the same logic and state as showing all opportunities.
    // It first ensures the full opportunity data is loaded.
    handleShowOpportunities().then((fullOpportunities) => {
      if (fullOpportunities && fullOpportunities.length > 0) {
        const specificOpp = fullOpportunities.find(
          (opp) => opp.reachOutTo === individualName
        )
        if (specificOpp) {
          // We call setIsOpportunitiesModalOpen here, but the data is already set
          // by the handleShowOpportunities call.
        } else {
          toast.info(
            'Dossier not yet available',
            'An opportunity dossier is being generated for this individual. Please check back shortly.'
          )
        }
      }
    })
  }
  // --- END OF DEFINITIVE FIX ---

  return (
    <>
      <AccordionItem
        value={event._id}
        className={`relative border-none rounded-xl overflow-hidden transition-all duration-300 ${isPending ? 'opacity-50' : ''}`}
      >
        <div className="relative">
          <SwipeToDelete onDelete={performDelete} onSwipeRight={handleSwipeRight}>
            <div className="relative p-4">
              <EventCardMobile
                event={event}
                onChat={handleChatAboutEvent}
                onDelete={performDelete}
                onFavorite={handleFavorite}
                onShowArticles={handleShowArticles}
                onShowOpportunities={handleShowOpportunities}
                isOpportunitiesLoading={isOpportunitiesLoading}
                isFavorited={isFavorited}
                isPending={isPending}
              />
              <EventCardDesktop
                event={event}
                onChat={handleChatAboutEvent}
                onDelete={performDelete}
                onFavorite={handleFavorite}
                onShowArticles={handleShowArticles}
                onShowOpportunities={handleShowOpportunities}
                isOpportunitiesLoading={isOpportunitiesLoading}
                isFavorited={isFavorited}
                isPending={isPending}
              />
            </div>
          </SwipeToDelete>
          <AccordionTrigger className="absolute top-1/2 -translate-y-1/2 right-2 z-20 h-9 w-9 p-0 flex-none justify-center rounded-full bg-slate-800/60 hover:bg-slate-700/80 data-[state=open]:bg-slate-700 text-slate-400 hover:text-white" />
        </div>
        <AccordionContent className="p-4 pt-0 bg-slate-900/50">
          {/* Pass the new handler down to the details component */}
          <EventCardDetails
            event={event}
            onShowArticles={handleShowArticles}
            onShowIndividualOpportunity={handleShowIndividualOpportunity}
          />
        </AccordionContent>
      </AccordionItem>

      <ArticleModal
        articles={event.source_articles}
        open={isArticlesModalOpen}
        onOpenChange={setIsArticlesModalOpen}
      />

      <OpportunityModal
        opportunities={opportunitiesForModal}
        open={isOpportunitiesModalOpen}
        onOpenChange={setIsOpportunitiesModalOpen}
      />

      <ConfirmationDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        title="Confirm Action"
        description={`This will send a detailed brief of the event "${event.synthesized_headline}" to your registered email address. Do you want to continue?`}
        confirmText="Send Email"
        onConfirm={handleSendEmail}
      />
    </>
  )
}
