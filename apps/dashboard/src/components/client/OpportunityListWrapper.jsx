// src/components/OpportunityListWrapper.jsx (version 1.1)
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AnimatedList, itemVariants } from '@/components/AnimatedList'
import { OpportunityCard } from '@/components/OpportunityCard'
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
            className={cn('min-w-full sm:min-w-[480px]')} // <-- ADDED MINIMUM WIDTH
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
