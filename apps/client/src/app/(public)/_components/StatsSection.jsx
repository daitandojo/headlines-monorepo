// apps/client/src/app/(public)/_components/StatsSection.jsx
'use client'

import { motion, useInView } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { animate } from 'framer-motion'
import { Database, FileText, Zap } from 'lucide-react'

function AnimatedCounter({ to, suffix = '' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    if (isInView) {
      const node = ref.current
      const controls = animate(0, to, {
        duration: 2,
        onUpdate(value) {
          node.textContent = Math.round(value).toLocaleString('en-US') + suffix
        },
      })
      return () => controls.stop()
    }
  }, [isInView, to, suffix])

  return <span ref={ref}>0</span>
}

export function StatsSection() {
  return (
    <section className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div className="p-6">
          <Database className="h-12 w-12 mx-auto text-blue-400 mb-4" />
          <p className="text-5xl font-bold text-slate-100 tracking-tighter">
            <AnimatedCounter to={1200000} suffix="+" />
          </p>
          <p className="text-lg text-slate-400 mt-2">Articles in Database</p>
        </div>
        <div className="p-6">
          <Zap className="h-12 w-12 mx-auto text-green-400 mb-4" />
          <p className="text-5xl font-bold text-slate-100 tracking-tighter">
            <AnimatedCounter to={50000} suffix="+" />
          </p>
          <p className="text-lg text-slate-400 mt-2">Verified Liquidity Events</p>
        </div>
        <div className="p-6">
          <FileText className="h-12 w-12 mx-auto text-purple-400 mb-4" />
          <p className="text-5xl font-bold text-slate-100 tracking-tighter">
            <AnimatedCounter to={15000} suffix="+" />
          </p>
          <p className="text-lg text-slate-400 mt-2">Sources Analyzed Daily</p>
        </div>
      </div>
    </section>
  )
}
