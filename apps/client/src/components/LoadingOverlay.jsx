// src/components/LoadingOverlay.jsx (version 1.0)
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { PremiumSpinner } from './ui/PremiumSpinner'

/**
 * A full-screen overlay component that displays a premium spinner.
 * It handles the fade-in and fade-out animations gracefully.
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
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/40 backdrop-blur-sm"
        >
          <PremiumSpinner />
          {text && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mt-4 text-base font-medium text-slate-200"
            >
              {text}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
