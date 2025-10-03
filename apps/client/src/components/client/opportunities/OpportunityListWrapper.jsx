// File: apps/client/src/components/client/OpportunityListWrapper.jsx

'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AnimatedList, itemVariants } from '../shared/AnimatedList'
import { OpportunityCard } from '../opportunities/OpportunityCard'
import { cn } from '@headlines/utils-shared'

export function OpportunityListWrapper({ items, onDelete }) {
  return (
    <AnimatedList className="space-y-3">
      <AnimatePresence>
        {items.map((opportunity) => (
          <motion.div
            key={opportunity._id}
            variants={itemVariants}
            exit={itemVariants.exit}
            layout
            className={cn('min-w-full sm:min-w-[480px]')}
          >
            <OpportunityCard
              opportunity={opportunity}
              onDelete={() => onDelete(opportunity._id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </AnimatedList>
  )
}
