// src/components/swipe/SwipeToDelete.jsx (version 1.0)
'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import { Trash2 } from 'lucide-react'

const SWIPE_THRESHOLD = -100 // pixels to swipe before delete is triggered

export function SwipeToDelete({ children, onDelete }) {
  const x = useMotionValue(0)

  const onDragEnd = (event, info) => {
    if (info.offset.x < SWIPE_THRESHOLD) {
      onDelete()
    }
  }

  const backgroundOpacity = useTransform(x, [-100, 0], [1, 0])
  const backgroundScale = useTransform(x, [-100, 0], [1, 0.8])

  return (
    <div className="relative w-full">
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-8 bg-red-600/80 pointer-events-none rounded-xl"
        style={{ opacity: backgroundOpacity, scale: backgroundScale }}
      >
        <Trash2 className="text-white h-6 w-6" />
      </motion.div>
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
