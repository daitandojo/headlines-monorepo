// packages/ui/src/PremiumSpinner.jsx (version 1.1.0)
'use client'

import { motion } from 'framer-motion'
import { cn } from '../../utils/src/index.js' // CORRECTED: Package import instead of alias

/**
 * A visually rich, multi-layered, animated spinner component.
 * It features rotating conic gradients and a dynamic sparkle effect.
 */
export function PremiumSpinner({ size = 80 }) {
  const sparkleCount = 8
  const sparkleRadius = size * 1.2

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Sparkles */}
      {[...Array(sparkleCount)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-cyan-300"
          style={{
            width: size / 20,
            height: size / 20,
            left: '50%',
            top: '50%',
            translateX: '-50%',
            translateY: '-50%',
          }}
          initial={{
            transform: `rotate(${
              (360 / sparkleCount) * i
            }deg) translateY(${sparkleRadius}px) scale(0)`,
          }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            delay: i * 0.1,
          }}
        />
      ))}

      {/* Outer Ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'conic-gradient(from 90deg, transparent 0%, #06b6d4 50%, transparent 100%)',
          maskImage:
            'radial-gradient(circle at center, transparent 75%, black 76%)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />

      {/* Inner Ring */}
      <motion.div
        className="absolute inset-[15%] rounded-full"
        style={{
          background:
            'conic-gradient(from -90deg, transparent 0%, #a855f7 50%, transparent 100%)',
          maskImage:
            'radial-gradient(circle at center, transparent 75%, black 76%)',
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />

      {/* Center Glow */}
      <div
        className="absolute inset-[35%] rounded-full bg-blue-500/20 blur-lg"
        style={{ animation: 'pulse 2s infinite ease-in-out' }}
      ></div>
    </div>
  )
}
