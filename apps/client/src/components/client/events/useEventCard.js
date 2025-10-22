// apps/client/src/components/client/events/useEventCard.js
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import useAppStore from '@/lib/store/use-app-store'
import { toast } from 'sonner'

export function useEventCard(event, onDelete, onFavoriteToggle, isFavorited) {
  const [isPending, startTransition] = useTransition()
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [isArticlesModalOpen, setIsArticlesModalOpen] = useState(false)
  const [isOpportunitiesModalOpen, setIsOpportunitiesModalOpen] = useState(false)
  const [opportunitiesForModal, setOpportunitiesForModal] = useState([])
  const [isOpportunitiesLoading, setIsLoadingOpportunities] = useState(false)

  const setChatContextPrompt = useAppStore((state) => state.setChatContextPrompt)
  const router = useRouter()

  const performDelete = () => {
    startTransition(() => {
      onDelete(event._id)
    })
  }

  const handleSwipeRight = () => {
    onFavoriteToggle(event._id, !isFavorited)
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

  const handleShowArticles = (e) => {
    if (e) e.stopPropagation()
    setIsArticlesModalOpen(true)
  }

  const handleShowOpportunities = async (e) => {
    if (e) e.stopPropagation()

    // An opportunity is fully populated if it has the 'whyContact' field.
    // The initial list fetch only populates '_id' and 'reachOutTo'.
    const isFullyPopulated = event.relatedOpportunities?.[0]?.whyContact

    if (isFullyPopulated) {
      setOpportunitiesForModal(event.relatedOpportunities)
      setIsOpportunitiesModalOpen(true)
      return
    }

    setIsLoadingOpportunities(true)
    try {
      // If not fully populated, we must fetch the full event details,
      // which includes the fully populated opportunities.
      const res = await fetch(`/api/events/${event._id}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to fetch event details')
      }
      const result = await res.json()
      const fullEventData = result.data

      if (
        fullEventData.relatedOpportunities &&
        fullEventData.relatedOpportunities.length > 0
      ) {
        setOpportunitiesForModal(fullEventData.relatedOpportunities)
        setIsOpportunitiesModalOpen(true)
      } else if (event.key_individuals && event.key_individuals.length > 0) {
        // This case is now correct: It means individuals were found, but dossier generation is pending or failed.
        toast.info(
          'Opportunities are being generated for these key individuals. Please check back shortly.'
        )
      } else {
        // This should not happen if the "Opportunities" button is visible, but is a safe fallback.
        toast.error('No opportunities found for this event.')
      }
    } catch (error) {
      toast.error('Could not load opportunities', { description: error.message })
    } finally {
      setIsLoadingOpportunities(false)
    }
  }

  return {
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
  }
}
