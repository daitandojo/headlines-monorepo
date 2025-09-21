'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AccordionContent, AccordionItem, ConfirmationDialog } from '@headlines/ui'
import useAppStore from '@/store/use-app-store'
import { SwipeToDelete } from './swipe/SwipeToDelete'
import { EventCardDesktop } from './events/EventCardDesktop'
import { EventCardMobile } from './events/EventCardMobile'
import { EventCardDetails } from './events/EventCardDetails'
// DEFINITIVE FIX: Import useAuth from its dedicated client entry point
import { useAuth } from '@headlines/auth/useAuth'
import { toast } from 'sonner'

export const SynthesizedEventCard = ({
  event,
  onSwipeLeft,
  onFavoriteToggle,
  isFavorited,
}) => {
  const [isPending, startTransition] = useTransition()
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const setChatContextPrompt = useAppStore((state) => state.setChatContextPrompt)
  const router = useRouter()
  const { user } = useAuth()

  const performSwipe = () => {
    startTransition(() => {
      if (isFavorited) {
        onFavoriteToggle(event._id, false)
      } else {
        onSwipeLeft({ itemId: event._id })
      }
    })
  }

  const handleSwipeRight = () => {
    if (isFavorited) {
      setIsEmailDialogOpen(true)
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
          <SwipeToDelete onSwipeLeft={performSwipe} onSwipeRight={handleSwipeRight}>
            <div className="relative p-4">
              <EventCardMobile
                event={event}
                onChat={handleChatAboutEvent}
                onSwipeLeft={performSwipe}
                onFavorite={handleFavorite}
                isFavorited={isFavorited}
                isPending={isPending}
              />
              <EventCardDesktop
                event={event}
                onChat={handleChatAboutEvent}
                onSwipeLeft={performSwipe}
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
