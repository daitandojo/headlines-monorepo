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

  const handleShowArticles = (e) => {
    e.stopPropagation()
    setIsArticlesModalOpen(true)
  }

  const handleShowOpportunities = async (e) => {
    if (e) e.stopPropagation()
    setIsLoadingOpportunities(true)
    try {
      const res = await fetch(`/api/events/${event._id}`)
      if (!res.ok) throw new Error('Failed to fetch event details')
      const result = await res.json()
      setOpportunitiesForModal(result.data.relatedOpportunities || [])
      setIsOpportunitiesModalOpen(true)
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
