// File: apps/copyboard/src/components/client/ArticleListWrapper.jsx

'use client'

import { Accordion } from '@/components/shared'
import { ArticleCard } from './ArticleCard'
import { AnimatePresence, motion } from 'framer-motion'
import { AnimatedList, itemVariants } from './AnimatedList'
import { cn } from '@headlines/utils-shared'

export function ArticleListWrapper({ items, onDelete }) {
  return (
    <Accordion type="single" collapsible>
      <AnimatedList className="w-full space-y-2">
        <AnimatePresence>
          {items.map((article) => {
            const isHighRelevance =
              (article.relevance_article || article.relevance_headline) > 69
            return (
              <motion.div
                key={article._id}
                variants={itemVariants}
                exit={itemVariants.exit}
                layout
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'rounded-xl bg-gradient-to-br from-slate-900 to-slate-800/60 shadow-lg shadow-black/40 border border-slate-700',
                  isHighRelevance && 'card-glow impatient-wobble',
                  'min-w-full sm:min-w-[480px]'
                )}
              >
                <ArticleCard article={article} onDelete={() => onDelete(article._id)} />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </AnimatedList>
    </Accordion>
  )
}
