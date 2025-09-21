'use client'
import { Accordion } from '@headlines/ui'
import { SynthesizedEventCard } from '@/components/SynthesizedEventCard'
import { AnimatePresence, motion } from 'framer-motion'
import { AnimatedList, itemVariants } from './AnimatedList'
import { cn } from '@headlines/utils-client'
export const EventList = ({
  items: events = [],
  onSwipeLeft,
  onFavoriteToggle,
  userFavoritedIds,
}) => {
  return (
    <Accordion type="single" collapsible>
      <AnimatedList className="w-full space-y-4">
        <AnimatePresence>
          {events.map((event) => {
            const isHighRelevance = event.highest_relevance_score > 69
            const isFavorited = userFavoritedIds.has(event._id)
            return (
              <motion.div
                key={event.event_key}
                variants={itemVariants}
                exit={itemVariants.exit}
                layout
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'rounded-xl bg-gradient-to-br from-slate-900 to-slate-800/60 shadow-lg shadow-black/40 border border-slate-700',
                  isHighRelevance && 'card-glow',
                  isFavorited &&
                    'bg-gradient-to-br from-yellow-900/50 to-slate-800/60 border-yellow-700/50'
                )}
              >
                <SynthesizedEventCard
                  event={event}
                  onSwipeLeft={onSwipeLeft}
                  onFavoriteToggle={onFavoriteToggle}
                  isFavorited={isFavorited}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </AnimatedList>
    </Accordion>
  )
}
