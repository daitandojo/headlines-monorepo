// src/components/chat/ChatLoadingIndicator.jsx (version 2.0)
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Sparkles } from 'lucide-react'

const statuses = [
  'Analyzing query...',
  'Searching internal database...',
  'Consulting Wikipedia...',
  'Scanning web results...',
  'Synthesizing response...',
  'Performing final checks...',
]

/**
 * A self-animating loading indicator for the chat that cycles through
 * a predefined list of statuses to give a sense of progress.
 */
export function ChatLoadingIndicator() {
  const [statusIndex, setStatusIndex] = useState(0)

  useEffect(() => {
    // This effect runs only once on mount to start the interval.
    const interval = setInterval(() => {
      setStatusIndex((prevIndex) => (prevIndex + 1) % statuses.length)
    }, 1800) // Change status every 1.8 seconds

    // Cleanup function to clear the interval when the component unmounts.
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center">
        <Bot className="h-5 w-5" />
      </div>
      <div className="px-4 py-3 rounded-xl max-w-[85%] bg-slate-800">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="h-4 w-4 text-yellow-400" />
          </motion.div>
          <div className="relative h-5 w-52 overflow-hidden">
            <AnimatePresence initial={false}>
              <motion.p
                key={statusIndex}
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="absolute inset-0 italic"
              >
                {statuses[statusIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
