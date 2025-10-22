// apps/client/src/components/client/shared/SwipeToDelete.jsx
'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import { Trash2, Heart } from 'lucide-react'

const SWIPE_THRESHOLD = -100
const FAVORITE_THRESHOLD = 100

export function SwipeToDelete({ children, onDelete, onSwipeRight }) {
  const x = useMotionValue(0)

  const onDragEnd = (event, info) => {
    if (info.offset.x < SWIPE_THRESHOLD) {
      onDelete()
    } else if (onSwipeRight && info.offset.x > FAVORITE_THRESHOLD) {
      onSwipeRight()
    }
  }

  const deleteBackgroundOpacity = useTransform(x, [-100, 0], [1, 0])
  const deleteBackgroundScale = useTransform(x, [-100, 0], [1, 0.8])

  const favoriteBackgroundOpacity = useTransform(x, [0, 100], [0, 1])
  const favoriteBackgroundScale = useTransform(x, [0, 100], [0.8, 1])

  return (
    <div className="relative w-full">
      {/* Delete Background (on the right, revealed by swiping left) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-8 bg-red-600/80 pointer-events-none rounded-xl"
        style={{ opacity: deleteBackgroundOpacity, scale: deleteBackgroundScale }}
      >
        <Trash2 className="text-white h-6 w-6" />
      </motion.div>

      {/* Favorite Background (on the left, revealed by swiping right) */}
      {onSwipeRight && (
        <motion.div
          className="absolute inset-0 flex items-center justify-start pl-8 bg-red-500/80 pointer-events-none rounded-xl"
          style={{ opacity: favoriteBackgroundOpacity, scale: favoriteBackgroundScale }}
        >
          <Heart className="text-white h-6 w-6" />
        </motion.div>
      )}

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={onDragEnd}
        style={{ x }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  )
}
