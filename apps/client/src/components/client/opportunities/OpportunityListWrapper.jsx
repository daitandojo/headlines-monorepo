// apps/client/src/components/client/opportunities/OpportunityListWrapper.jsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AnimatedList, itemVariants } from '../shared/AnimatedList'
import { OpportunityCard } from '../opportunities/OpportunityCard'
import { cn } from '@headlines/utils-shared'

export function OpportunityListWrapper({
  items,
  onDelete,
  onFavoriteToggle,
  userFavoritedIds,
}) {
  return (
    <AnimatedList className="space-y-3">
      <AnimatePresence>
        {items.map((opportunity) => {
          // DEFINITIVE FIX: The `isFavorited` status is now calculated for each card.
          const isFavorited = userFavoritedIds.has(opportunity._id)
          return (
            <motion.div
              key={opportunity._id}
              variants={itemVariants}
              exit={itemVariants.exit}
              layout
              className={cn('min-w-full sm:min-w-[480px]')}
            >
              {/* DEFINITIVE FIX: The `onFavoriteToggle` and `isFavorited` props are now correctly passed to the card. */}
              <OpportunityCard
                opportunity={opportunity}
                onDelete={() => onDelete(opportunity._id)}
                onFavoriteToggle={onFavoriteToggle}
                isFavorited={isFavorited}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </AnimatedList>
  )
}
