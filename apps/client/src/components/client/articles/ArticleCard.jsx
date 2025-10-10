// apps/client/src/components/client/articles/ArticleCard.jsx
'use client'

import { useState, useTransition } from 'react'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  ConfirmationDialog,
} from '@/components/shared'
import {
  Trash2,
  ExternalLink,
  Users,
  Mail,
  Building,
  Briefcase,
  Zap,
  Loader2,
} from 'lucide-react'
import { getCountryFlag } from '@headlines/utils-shared'
import { SwipeToDelete } from '../shared/SwipeToDelete'
import useAppStore from '@/lib/store/use-app-store'
import { cn } from '@headlines/utils-shared'
import { EventModal } from '../events/EventModal'
import { toast } from 'sonner'

const getRelevanceBadgeClass = (score) => {
  if (score >= 90)
    return 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-lg shadow-red-500/10'
  if (score >= 75)
    return 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10'
  return 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
}

export const ArticleCard = ({ article, onDelete }) => {
  const [isPending, startTransition] = useTransition()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { deletePreferences, setDeletePreference } = useAppStore((state) => ({
    deletePreferences: state.deletePreferences,
    setDeletePreference: state.setDeletePreference,
  }))
  const skipConfirmation = deletePreferences.skipArticleConfirmation

  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [eventForModal, setEventForModal] = useState(null)
  const [isEventLoading, setIsEventLoading] = useState(false)

  const handleDelete = () => {
    startTransition(() => {
      onDelete()
    })
  }

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    if (skipConfirmation) {
      handleDelete()
    } else {
      setIsDialogOpen(true)
    }
  }

  const handleShowEvent = async (e) => {
    e.stopPropagation()
    if (!article.synthesizedEventId) return
    setIsEventLoading(true)
    try {
      const res = await fetch(`/api/events/${article.synthesizedEventId}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to fetch event details')
      }
      const result = await res.json()
      setEventForModal(result.data)
      setIsEventModalOpen(true)
    } catch (error) {
      toast.error('Could not load event', { description: error.message })
    } finally {
      setIsEventLoading(false)
    }
  }

  const flags = (article.country || []).map((c) => getCountryFlag(c)).join(' ')
  const relevanceScore = article.relevance_article || article.relevance_headline

  return (
    <>
      <AccordionItem
        value={article._id}
        className="border-none overflow-hidden rounded-xl"
      >
        <div className="relative">
          <SwipeToDelete onDelete={handleDelete}>
            <div
              className={cn(
                'p-4 relative z-10 bg-cover bg-center',
                article.imageUrl && 'min-h-[150px] flex flex-col justify-end'
              )}
              style={
                article.imageUrl ? { backgroundImage: `url(${article.imageUrl})` } : {}
              }
            >
              {article.imageUrl && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent z-0" />
              )}
              <div className="relative z-10">
                <TooltipProvider delayDuration={100}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        className={`text-sm font-bold px-2.5 py-1 ${getRelevanceBadgeClass(
                          relevanceScore
                        )}`}
                      >
                        {relevanceScore}
                      </Badge>
                      <span className="text-lg hidden sm:inline">{flags}</span>{' '}
                      <p className="text-xs sm:text-sm text-slate-300 truncate shadow-black drop-shadow-lg">
                        {article.newspaper}
                      </p>
                    </div>
                    <div className="flex items-center flex-shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(article.link, '_blank')
                            }}
                            className="text-slate-300 hover:text-blue-400 bg-black/20 hover:bg-blue-500/20 h-8 w-8"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open in new tab</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isPending}
                            onClick={handleDeleteClick}
                            className="text-slate-300 hover:text-red-400 bg-black/20 hover:bg-red-500/20 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete article</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="flex-grow min-w-0 pr-12">
                    <p className="font-serif font-bold text-base sm:text-lg text-white line-clamp-3 shadow-black drop-shadow-lg">
                      <span className="text-lg sm:hidden mr-2">{flags}</span>{' '}
                      {article.headline_en || `(en N/S): ${article.headline}`}
                    </p>
                  </div>
                </TooltipProvider>
              </div>
            </div>
          </SwipeToDelete>
          <AccordionTrigger className="absolute top-1/2 -translate-y-1/2 right-2 z-20 h-9 w-9 p-0 flex-none justify-center rounded-full bg-slate-800/60 hover:bg-slate-700/80 data-[state=open]:bg-slate-700 text-slate-400 hover:text-white" />
        </div>
        <AccordionContent className="p-4 pt-0">
          <div className="border-t border-slate-700/50 pt-4 mt-2 space-y-4">
            {article.synthesizedEventId && (
              <Button
                variant="outline"
                className="w-full justify-start text-left"
                onClick={handleShowEvent}
                disabled={isEventLoading}
              >
                {isEventLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2 text-blue-400" />
                )}
                View Synthesized Event
              </Button>
            )}
            {article.assessment_article && (
              <div>
                <h4 className="font-semibold text-sm text-slate-300 mb-1">
                  Intelligence Analysis
                </h4>
                <p className="text-sm text-slate-400 italic break-words">
                  "{article.assessment_article}"
                </p>
              </div>
            )}
            {article.key_individuals && article.key_individuals.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-slate-300 mb-2 border-b border-slate-700 pb-1">
                  Key Individuals
                </h4>
                <div className="space-y-3 mt-2">
                  {article.key_individuals.map((person, index) => (
                    <div key={index} className="p-3 rounded-md bg-slate-800/50">
                      <p className="font-bold text-slate-100 flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" /> {person.name}
                      </p>
                      <div className="pl-6 space-y-1 mt-1 text-sm text-slate-400">
                        {person.role_in_event && (
                          <p className="flex items-center gap-2">
                            <Briefcase className="h-3 w-3" /> {person.role_in_event}
                          </p>
                        )}
                        {person.company && (
                          <p className="flex items-center gap-2">
                            <Building className="h-3 w-3" /> {person.company}
                          </p>
                        )}
                        {person.email_suggestion && (
                          <a
                            href={`mailto:${person.email_suggestion}`}
                            className="flex items-center gap-2 text-blue-400 hover:underline"
                          >
                            <Mail className="h-3 w-3" /> {person.email_suggestion}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      {eventForModal && (
        <EventModal
          events={[eventForModal]}
          open={isEventModalOpen}
          onOpenChange={setIsEventModalOpen}
        />
      )}

      <ConfirmationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConfirm={handleDelete}
        isPending={isPending}
        title="Confirm Deletion"
        description={`Are you sure you want to permanently discard the article: "${
          article.headline_en || article.headline
        }"?`}
        confirmText="Discard Article"
        showSkipOption={true}
        isSkipChecked={skipConfirmation}
        onSkipChange={(checked) =>
          setDeletePreference('skipArticleConfirmation', checked)
        }
      />
    </>
  )
}
