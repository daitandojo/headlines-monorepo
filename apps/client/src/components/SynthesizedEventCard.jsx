// src/components/SynthesizedEventCard.jsx (version 8.3)
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { FileText, Loader2, AlertTriangle } from 'lucide-react'
import useAppStore from '@/store/use-app-store'
import { SwipeToDelete } from './swipe/SwipeToDelete'
import { EventCardDesktop } from './events/EventCardDesktop'
import { EventCardMobile } from './events/EventCardMobile'
import { EventCardDetails } from './events/EventCardDetails'
import { getEventDeletionImpact } from '@/actions/events'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'

const Checkbox = ({ id, label, checked, onChange, disabled, count, itemLabel }) => (
  <div className="flex items-center space-x-2">
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
    />
    <Label
      htmlFor={id}
      className={cn(
        'text-sm font-medium',
        disabled ? 'text-slate-500' : 'text-slate-300'
      )}
    >
      {label} <span className="font-bold">({count})</span> {itemLabel}
    </Label>
  </div>
)

export const SynthesizedEventCard = ({ event, onDelete }) => {
  const [isPending, startTransition] = useTransition()
  const setChatContextPrompt = useAppStore((state) => state.setChatContextPrompt)
  const router = useRouter()

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [impact, setImpact] = useState(null)
  const [isImpactLoading, setIsImpactLoading] = useState(false)
  const [deleteOpps, setDeleteOpps] = useState(true)
  const [deleteArticles, setDeleteArticles] = useState(false)

  const performDelete = (options) => {
    startTransition(() => {
      onDelete(options)
      setIsDeleteDialogOpen(false)
    })
  }

  const handleOpenDeleteDialog = async (e) => {
    e.stopPropagation()
    setIsImpactLoading(true)
    setIsDeleteDialogOpen(true)

    try {
      const impactResult = await getEventDeletionImpact(event._id)
      if (impactResult.success) {
        const { opportunityCount, articleIds } = impactResult
        if (opportunityCount === 0 && articleIds.length === 0) {
          setIsDeleteDialogOpen(false)
          performDelete({ eventId: event._id })
          return
        }
        setImpact(impactResult)
      } else {
        toast.error('Failed to load deletion impact.')
        setIsDeleteDialogOpen(false)
      }
    } finally {
      setIsImpactLoading(false)
    }
  }

  const handleConfirmDelete = () => {
    performDelete({
      eventId: event._id,
      deleteOpportunities: impact?.opportunityCount > 0 && deleteOpps,
      deleteArticleIds:
        impact?.articleIds.length > 0 && deleteArticles ? impact.articleIds : [],
    })
  }

  const handleChatAboutEvent = (e) => {
    e.stopPropagation()
    const prompt = `Tell me more about the event: "${event.synthesized_headline}". What are the key implications?`
    setChatContextPrompt(prompt)
    router.push('/chat')
  }

  // Pass handleOpenDeleteDialog instead of the raw onDelete
  const desktopDeleteHandler = (e) => {
    e.stopPropagation()
    handleOpenDeleteDialog(e)
  }

  return (
    <div className="relative w-full">
      <AccordionItem
        value={event.event_key}
        className={`relative border-none rounded-xl overflow-hidden transition-all duration-300 ${isPending ? 'opacity-50' : ''}`}
      >
        <SwipeToDelete onDelete={handleOpenDeleteDialog}>
          <div className="p-4 bg-transparent relative z-10">
            <EventCardMobile
              event={event}
              onChat={handleChatAboutEvent}
              onDelete={desktopDeleteHandler}
              isPending={isPending}
            />
            <EventCardDesktop
              event={event}
              onChat={handleChatAboutEvent}
              onDelete={desktopDeleteHandler}
              isPending={isPending}
            />
          </div>
        </SwipeToDelete>

        <AccordionTrigger className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:no-underline rounded-b-xl bg-black/20 hover:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Show Intelligence Details & Sources</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-4 pt-4 bg-slate-900/50">
          <EventCardDetails event={event} />
        </AccordionContent>
      </AccordionItem>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion and Impact</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete the event:{' '}
              <span className="font-semibold italic">"{event.synthesized_headline}"</span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isImpactLoading ? (
            <div className="flex items-center justify-center p-8 text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculating impact...
            </div>
          ) : (
            impact && (
              <div className="space-y-4 p-4 rounded-md bg-slate-800/50 border border-slate-700">
                <h4 className="font-semibold text-slate-200">Associated Data:</h4>
                {impact.opportunityCount > 0 ? (
                  <Checkbox
                    id="delete-opps"
                    label="Delete associated"
                    itemLabel="opportunities"
                    checked={deleteOpps}
                    onChange={(e) => setDeleteOpps(e.target.checked)}
                    count={impact.opportunityCount}
                  />
                ) : (
                  <p className="text-sm text-slate-400">
                    No associated opportunities found.
                  </p>
                )}

                {impact.articleIds.length > 0 && (
                  <>
                    <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-900/30 border border-yellow-700/50 text-yellow-300">
                      <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="text-xs">
                        <p className="font-bold">Warning:</p>
                        <p>
                          Deleting source articles is a destructive action. It is
                          generally not recommended as other opportunities might link to
                          them.
                        </p>
                      </div>
                    </div>
                    <Checkbox
                      id="delete-articles"
                      label="Delete source"
                      itemLabel="articles"
                      checked={deleteArticles}
                      onChange={(e) => setDeleteArticles(e.target.checked)}
                      count={impact.articleIds.length}
                    />
                  </>
                )}
              </div>
            )
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={handleConfirmDelete}
              disabled={isImpactLoading || isPending}
              variant="destructive"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
