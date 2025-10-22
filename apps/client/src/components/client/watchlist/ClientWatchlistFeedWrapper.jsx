// apps/client/src/components/client/watchlist/WatchlistFeedWrapper.jsx
'use client'

import { Accordion } from '@/components/shared'
import { ArticleCard } from '../articles/ArticleCard'
import { SynthesizedEventCard } from '../events/SynthesizedEventCard'
import { AnimatePresence, motion } from 'framer-motion'
import { AnimatedList, itemVariants } from '../shared/AnimatedList'
import { cn } from '@headlines/utils-shared'

export function WatchlistFeedWrapper({ items, onDelete, onFavoriteToggle, userFavoritedIds }) {
  
  return (
    <Accordion type="single" collapsible>
      <AnimatedList className="w-full space-y-4">
        <AnimatePresence>
          {items.map((item) => {
            const isFavorited = userFavoritedIds.has(item._id)

            const score = item._type === 'article' 
              ? (item.relevance_article || item.relevance_headline) 
              : item.highest_relevance_score;
            const isHighRelevance = score > 69;

            return (
              <motion.div
                key={item._id}
                variants={itemVariants}
                exit={itemVariants.exit}
                layout
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'rounded-xl bg-gradient-to-br from-slate-900 to-slate-800/60 shadow-lg shadow-black/40 border border-slate-700',
                  isHighRelevance && 'card-glow',
                  isFavorited && 'bg-gradient-to-br from-yellow-900/50 to-slate-800/60 border-yellow-700/50'
                )}
              >
                {item._type === 'article' ? (
                  <ArticleCard 
                    article={item} 
                    // MODIFIED: Pass the full item object to the handler
                    onDelete={() => onDelete(item)} 
                  />
                ) : (
                  <SynthesizedEventCard
                    event={item}
                    // MODIFIED: Pass the full item object to the handler
                    onDelete={() => onDelete(item)}
                    onFavoriteToggle={(isFavorited) => onFavoriteToggle(item, isFavorited)}
                    isFavorited={isFavorited}
                  />
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </AnimatedList>
    </Accordion>
  )
}