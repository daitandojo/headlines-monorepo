// src/components/EventList.jsx (version 4.2)
import { Accordion } from '@/components/ui/accordion'
import { SynthesizedEventCard } from '@/components/SynthesizedEventCard'
import { AnimatePresence, motion } from 'framer-motion'
import { AnimatedList, itemVariants } from './AnimatedList'
import { cn } from '@/lib/utils'

export const EventList = ({ events, onDelete }) => {
  return (
    <Accordion type="single" collapsible>
      <AnimatedList className="w-full space-y-4">
        <AnimatePresence>
          {events.map((event) => {
            const isHighRelevance = event.highest_relevance_score > 69
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
                  isHighRelevance && 'card-glow impatient-wobble',
                  'min-w-full sm:min-w-[480px]' // <-- ADDED MINIMUM WIDTH
                )}
              >
                <SynthesizedEventCard
                  event={event}
                  onDelete={() => onDelete({ eventId: event._id })}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </AnimatedList>
    </Accordion>
  )
}
