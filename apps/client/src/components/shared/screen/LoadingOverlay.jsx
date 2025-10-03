// packages/ui/src/LoadingOverlay.jsx (version 1.3.0)
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { PremiumSpinner } from '../spinners/PremiumSpinner'

/**
 * A persistent overlay that displays a premium spinner.
 * It uses AnimatePresence to gracefully fade in and out on top of content.
 *
 * @param {object} props
 * @param {boolean} props.isLoading - Controls the visibility of the overlay.
 * @param {string} [props.text] - Optional text to display below the spinner.
 */
export function LoadingOverlay({ isLoading, text }) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          // CRITICAL FIX: High z-index ensures it's on top of everything inside its relative parent.
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg"
        >
          <PremiumSpinner />
          {text && <p className="mt-4 text-base font-medium text-slate-200">{text}</p>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
