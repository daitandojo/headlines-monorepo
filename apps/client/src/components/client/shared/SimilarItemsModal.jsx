// apps/client/src/components/client/shared/SimilarItemsModal.jsx
'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ScrollArea,
} from '@/components/shared'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { Layers, SearchX } from 'lucide-react'
import { EventCardDesktop } from '../events/EventCardDesktop'
import { OpportunityCard } from '../opportunities/OpportunityCard'

async function fetchSimilarItems(itemId, itemType) {
  const res = await fetch(`/api/vector-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, itemType }),
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to fetch similar items')
  }
  return res.json()
}

export function SimilarItemsModal({ item, open, onOpenChange }) {
  const [similarItems, setSimilarItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open && item?._id && item?._type) {
      setIsLoading(true)
      setError(null)
      setSimilarItems([])
      fetchSimilarItems(item._id, item._type)
        .then((result) => setSimilarItems(result.data))
        .catch(setError)
        .finally(() => setIsLoading(false))
    }
  }, [open, item])

  const originalItemTitle =
    item?._type === 'event' ? item.synthesized_headline : item?.reachOutTo

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] h-[80vh] flex flex-col bg-slate-900 border-slate-700">
        <DialogHeader className="p-6 border-b border-slate-700">
          <DialogTitle className="text-2xl text-slate-100 flex items-center gap-2">
            <Layers className="h-6 w-6 text-teal-400" />
            Similar Items
          </DialogTitle>
          <DialogDescription className="text-slate-400 truncate">
            Showing items contextually similar to: "{originalItemTitle}"
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
              {error && (
                <div className="text-red-500 p-4 bg-red-500/10 rounded-md">
                  Error: {error.message}
                </div>
              )}
              {!isLoading && !error && similarItems.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <SearchX className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold">No similar items found.</h3>
                  <p>
                    Our vector database could not find any contextually similar items.
                  </p>
                </div>
              )}
              {similarItems.map((similarItem) => (
                <div key={similarItem._id}>
                  {similarItem._type === 'event' && (
                    <EventCardDesktop
                      event={similarItem}
                      // Pass dummy functions as these cards are for display only
                      onChat={() => {}}
                      onDelete={() => {}}
                      onFavorite={() => {}}
                      onShowArticles={() => {}}
                      onShowOpportunities={() => {}}
                      onShowSimilar={() => {}}
                    />
                  )}
                  {similarItem._type === 'opportunity' && (
                    <OpportunityCard
                      opportunity={similarItem}
                      onDelete={() => {}}
                      onFavoriteToggle={() => {}}
                      onShowSimilar={() => {}}
                    />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
