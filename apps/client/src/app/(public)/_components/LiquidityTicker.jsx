// apps/client/src/app/(public)/_components/LiquidityTicker.jsx
'use client'

import { getCountryFlag } from '@headlines/utils-shared'
import { motion } from 'framer-motion'
import { format } from 'date-fns'

export function LiquidityTicker({ events }) {
  if (!events || events.length === 0) {
    return null
  }

  // Duplicate the events to create a seamless looping effect
  const duplicatedEvents = [...events, ...events]

  const tickerVariants = {
    animate: {
      x: ['0%', '-50%'],
      transition: {
        x: {
          repeat: Infinity,
          repeatType: 'loop',
          duration: events.length * 10, // Increase duration for slower, more readable scroll
          ease: 'linear',
        },
      },
    },
  }

  return (
    <div className="w-full overflow-hidden bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-lg">
      <div className="relative h-20">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />

        <motion.div
          className="flex h-full items-center"
          variants={tickerVariants}
          animate="animate"
        >
          {duplicatedEvents.map((event, index) => (
            <div
              key={`${event._id}-${index}`}
              className="flex-shrink-0 flex items-center gap-4 px-8"
              style={{ minWidth: 'max-content' }}
            >
              <span className="text-3xl">{getCountryFlag(event.country)}</span>
              <div>
                <p className="text-sm font-semibold text-slate-200">{event.headline}</p>
                <p className="text-xs text-slate-500">
                  {format(new Date(), 'MMM d, yyyy')} • Source: Financial Times
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
