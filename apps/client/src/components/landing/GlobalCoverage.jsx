// apps/client/src/app/(public)/_components/GlobalCoverage.jsx
'use client'

import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

const features = [
  {
    name: '73 Countries Monitored',
    description:
      'Our AI operates across continents, ensuring you never miss an opportunity in your region.',
  },
  {
    name: 'Native Language Processing',
    description:
      'We analyze sources in their original language for maximum accuracy and nuance.',
  },
  {
    name: 'Source Triangulation',
    description:
      'Events are verified against multiple sources, from national newspapers to regulatory filings.',
  },
  {
    name: '24/7 Platform Reliability',
    description:
      'Our systems autonomously monitor data integrity to ensure a continuous, reliable intelligence flow.',
  },
]

export function GlobalCoverage() {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="relative h-96 lg:h-auto lg:self-stretch">
          <div className="absolute inset-0 bg-slate-900/50 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 hero-grid-background opacity-50" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--primary)/0.1),transparent_40%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,hsl(var(--ring)/0.1),transparent_40%)]" />
          </div>
        </div>
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter">
              Global Reach, Local Depth. Zero Blind Spots.
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Our infrastructure is built for the global wealth landscape. We go beyond
              simple translations to understand context, verify facts, and deliver
              intelligence with unparalleled precision.
            </p>
            <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
              {features.map((feature) => (
                <div key={feature.name} className="relative">
                  <dt>
                    <CheckCircle
                      className="absolute h-6 w-6 text-green-500"
                      aria-hidden="true"
                    />
                    <p className="ml-9 text-lg font-semibold leading-6 text-slate-100">
                      {feature.name}
                    </p>
                  </dt>
                  <dd className="ml-9 mt-1 text-base leading-6 text-slate-400">
                    {feature.description}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
