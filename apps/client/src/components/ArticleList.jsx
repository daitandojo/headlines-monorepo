// src/components/ArticleList.jsx (version 4.2)
import { Accordion } from '@/components/ui/accordion'
import { ArticleCard } from '@/components/ArticleCard'
import { AnimatePresence, motion } from 'framer-motion'
import { AnimatedList, itemVariants } from './AnimatedList'
import { cn } from '@/lib/utils'

export const ArticleList = ({ articles, onDelete }) => {
  return (
    <Accordion type="single" collapsible>
      <AnimatedList className="w-full space-y-2">
        <AnimatePresence>
          {articles.map((article) => {
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
                  'min-w-full sm:min-w-[480px]' // <-- ADDED MINIMUM WIDTH
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
