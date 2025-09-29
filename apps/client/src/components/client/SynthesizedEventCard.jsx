// File: apps/client/src/components/client/SynthesizedEventCard.jsx (Restored)
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AccordionContent, AccordionItem, ConfirmationDialog } from '@/components/shared'
import useAppStore from '@/lib/store/use-app-store'
import { SwipeToDelete } from '../swipe/SwipeToDelete'
import { EventCardDesktop } from '../events/EventCardDesktop'
import { EventCardMobile } from '../events/EventCardMobile'
import { EventCardDetails } from '../events/EventCardDetails'
import { useAuth } from '@/lib/auth/client'
import { toast } from 'sonner'

export const SynthesizedEventCard = ({
  event,
  onDelete, // <-- Changed from onSwipeLeft
  onFavoriteToggle,
  isFavorited,
}) => {
  const [isPending, startTransition] = useTransition()
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const setChatContextPrompt = useAppStore((state) => state.setChatContextPrompt)
  const router = useRouter()
  const { user } = useAuth()

  const performDelete = () => {
    startTransition(() => {
      onDelete(event._id)
    })
  }

  const handleSwipeRight = () => {
    if (isFavorited) {
      setIsEmailDialogOpen(true) // <-- Un-commented
    } else {
      toast.info('Item must be favorited to email.')
    }
  }

  const handleChatAboutEvent = (e) => {
    e.stopPropagation()
    const prompt = `Tell me more about the event: "${event.synthesized_headline}". What are the key implications?`
    setChatContextPrompt(prompt)
    router.push('/chat')
  }

  const handleFavorite = (e) => {
    e.stopPropagation()
    onFavoriteToggle(event._id, !isFavorited)
  }

  return (
    <>
      <div className="relative w-full">
        <AccordionItem
          value={event.event_key}
          className={`relative border-none rounded-xl overflow-hidden transition-all duration-300 ${isPending ? 'opacity-50' : ''}`}
        >
          <SwipeToDelete onDelete={performDelete} onSwipeRight={handleSwipeRight}>
            <div className="relative p-4">
              <EventCardMobile
                event={event}
                onChat={handleChatAboutEvent}
                onDelete={performDelete}
                onFavorite={handleFavorite}
                isFavorited={isFavorited}
                isPending={isPending}
              />
              <EventCardDesktop
                event={event}
                onChat={handleChatAboutEvent}
                onDelete={performDelete}
                onFavorite={handleFavorite}
                isFavorited={isFavorited}
                isPending={isPending}
              />
            </div>
          </SwipeToDelete>
          <AccordionContent className="p-4 pt-0 bg-slate-900/50">
            <EventCardDetails event={event} />
          </AccordionContent>
        </AccordionItem>
      </div>
      {/* Un-commented this block */}
      <ConfirmationDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        title="Confirm Action"
        description={`This will send a detailed brief of the event "${event.synthesized_headline}" to your registered email address. Do you want to continue?`}
        confirmText="Send Email"
        onConfirm={() => {
          toast.info('Email functionality is not yet implemented.')
          setIsEmailDialogOpen(false)
        }}
      />
    </>
  )
}
