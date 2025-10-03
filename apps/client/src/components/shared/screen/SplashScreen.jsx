// src/components/SplashScreen.jsx (version 2.0)
'use client'

import { motion } from 'framer-motion'
import { Briefcase } from 'lucide-react'

const containerVariants = {
  initial: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
}

const wooshContainerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const wooshVariants = {
  initial: {
    scale: 0,
    opacity: 0,
    borderRadius: '50%',
  },
  animate: {
    scale: 1,
    opacity: 1,
    borderRadius: ['50%', '40%', '30%'],
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1], // "easeOutCirc"
    },
  },
}

const textVariants = {
  initial: {
    scale: 0.8,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      delay: 0.5,
      duration: 0.5,
      ease: 'easeOut',
    },
  },
}

export function SplashScreen() {
  const wooshLayers = 5

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(224,71.4%,4.1%)]"
    >
      <div className="relative flex flex-col items-center justify-center w-64 h-64">
        <div className="relative flex items-center justify-center w-32 h-32">
          {/* The "Woosh" Animation Layers */}
          <motion.div
            variants={wooshContainerVariants}
            initial="initial"
            animate="animate"
            className="absolute inset-0"
          >
            {[...Array(wooshLayers)].map((_, i) => (
              <motion.div
                key={i}
                variants={wooshVariants}
                className="absolute inset-0 border-2 border-blue-400/50"
                style={{
                  transformOrigin: 'center',
                  width: `${100 - i * 15}%`,
                  height: `${100 - i * 15}%`,
                  top: `${(i * 15) / 2}%`,
                  left: `${(i * 15) / 2}%`,
                }}
              />
            ))}
          </motion.div>
          {/* The Central Icon */}
          <motion.div variants={textVariants}>
            <Briefcase size={48} className="text-blue-300" />
          </motion.div>
        </div>
        <motion.h1
          variants={textVariants}
          className="mt-6 text-3xl font-bold text-slate-200"
        >
          Headlines
        </motion.h1>
      </div>
    </motion.div>
  )
}
