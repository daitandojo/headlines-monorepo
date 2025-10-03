// apps/client/src/app/(public)/_components/AboutSection.jsx
'use client'

import { motion } from 'framer-motion'

export function AboutSection() {
  return (
    <section className="w-full max-w-4xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter">
          Built for the Modern Wealth Advisor
        </h2>
        <div className="mt-6 prose prose-lg prose-invert mx-auto text-slate-400">
          <p>
            In today's market, information is commoditized. Intelligence is not. Headlines
            AI was founded on a simple premise: wealth managers need more than just news;
            they need verified, actionable signals delivered with speed and precision.
          </p>
          <p>
            Our platform deploys a fleet of autonomous AI agents that work around the
            clock. These agents read, translate, and contextualize millions of data points
            from sources often overlooked by traditional aggregators. They are trained to
            think like analysts—identifying not just the "what," but the "who" and "why"
            behind every significant wealth event. This is the new alpha: agentic
            intelligence, always on the lookout for your next mandate.
          </p>
        </div>
      </motion.div>
    </section>
  )
}
