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
  } = useEventCard(event, onDelete, onFavoriteToggle, isFavorited)

  const handleSendEmail = async () => {
    if (!user) return
    toast.promise(sendItemToEmail(event._id, 'event'), {
      loading: `Sending event brief to ${user.email}...`,
      success: 'Event successfully sent to your email.',
      error: 'Failed to send email.',
    })
    setIsEmailDialogOpen(false)
  }

  return (
    <>
      <AccordionItem
        value={event.event_key}
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
          <EventCardDetails event={event} onShowArticles={handleShowArticles} />
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
