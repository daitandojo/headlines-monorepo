// apps/client/src/app/(public)/_components/Features.jsx
'use client'

import { motion } from 'framer-motion'
import { Zap, Target, Home, Layers, Share2, PenSquare } from 'lucide-react'

const features = [
  {
    icon: <Zap className="h-8 w-8 text-blue-400" />,
    title: 'Live Events Dashboard',
    description:
      'Track global liquidity events in real-time. Filter by country, sector, and deal size to focus on what matters to you.',
  },
  {
    icon: <Target className="h-8 w-8 text-green-400" />,
    title: 'Curated Opportunity Dossiers',
    description:
      'Move from signal to mandate. Each event is linked to actionable dossiers on key individuals, complete with estimated liquidity and AI-generated outreach points.',
  },
  {
    icon: <Home className="h-8 w-8 text-purple-400" />,
    title: 'Family Office Database',
    description:
      'Access our proprietary, continuously updated database of single and multi-family offices, tracking their investments and key personnel.',
  },
  {
    icon: <Layers className="h-8 w-8 text-yellow-400" />,
    title: 'Unrivaled Source Intelligence',
    description:
      'We go beyond headlines, ingesting data from newspapers, regulatory filings, PE/VC portfolio updates, and M&A journals.',
  },
  {
    icon: <Share2 className="h-8 w-8 text-cyan-400" />,
    title: 'Integrate Your Workflow',
    description:
      'Receive alerts via Email, Push, or WhatsApp. Prepare for meetings with one-click AI summaries and export any view to Excel.',
  },
  {
    icon: <PenSquare className="h-8 w-8 text-rose-400" />,
    title: 'AI-Powered Outreach',
    description:
      "Generate personalized meeting preps and draft compelling outreach emails based on an opportunity's specific context.",
  },
]

export function Features() {
  const containerVariants = {
    visible: { transition: { staggerChildren: 0.1 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  return (
    <section className="w-full">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {features.map((feature, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl"
          >
            <div className="flex items-center gap-4">
              {feature.icon}
              <h3 className="text-lg font-bold text-slate-100">{feature.title}</h3>
            </div>
            <p className="mt-3 text-slate-400">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
