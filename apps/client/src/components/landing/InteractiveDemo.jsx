// apps/client/src/app/(public)/_components/InteractiveDemo.jsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
} from '@/components/shared'
import { getCountryFlag } from '@headlines/utils-shared'
import { CheckCircle, Zap, User, Briefcase, Eye, Mail, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

const demoEvents = [
  {
    id: 1,
    country: 'Denmark',
    date: '2025-09-15T10:00:00Z',
    score: 95,
    headline: 'Founder of private logistics firm exits in €250M acquisition',
    opportunity: {
      name: 'J. Hansen',
      role: 'Founder & Seller',
      company: 'Nordic Freight Solutions',
      wealth: '~€175M',
      email: 'j.hansen@nordicfreight.com',
    },
    analysis: {
      assessment:
        'Confirmed sale of a privately-held company to a strategic buyer, resulting in a significant liquidity event for the founder.',
      sources: [
        { name: 'Børsen', link: '#' },
        { name: 'Financial Times', link: '#' },
      ],
      rag: 'Cross-referenced internal database: Found prior funding round in 2018.',
    },
  },
  {
    id: 2,
    country: 'Sweden',
    date: '2025-09-14T14:00:00Z',
    score: 92,
    headline: 'Family-owned industrial manufacturer announces succession plan',
    opportunity: {
      name: 'The Johansson Family',
      role: 'Owners',
      company: 'ScandiMechanics AB',
      wealth: 'Generational',
      email: null,
    },
    analysis: {
      assessment:
        'High-value signal of future liquidity. The transition to the next generation often precedes a partial or full sale of the family business.',
      sources: [{ name: 'Dagens Industri', link: '#' }],
      rag: 'Identified entity as a 3rd generation family business with €500M+ revenue.',
    },
  },
  {
    id: 3,
    country: 'United Kingdom',
    date: '2025-09-13T08:00:00Z',
    score: 88,
    headline: 'Early investor in fintech unicorn realizes gains in secondary sale',
    opportunity: {
      name: 'A. Wallace',
      role: 'Angel Investor',
      company: 'FinTech Growth Ltd',
      wealth: '~£45M',
      email: 'a.wallace@angelvest.co.uk',
    },
    analysis: {
      assessment:
        'Secondary share sale indicates early backers are cashing out, providing new liquidity ahead of a potential IPO.',
      sources: [
        { name: 'TechCrunch', link: '#' },
        { name: 'City A.M.', link: '#' },
      ],
      rag: 'No prior records found. New entity detected.',
    },
  },
]

export function InteractiveDemo() {
  const [selectedEventId, setSelectedEventId] = useState(demoEvents[0].id)
  const selectedEvent = demoEvents.find((e) => e.id === selectedEventId)

  const panelVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  return (
    <section className="w-full">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter">
          Experience the Workflow
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-400">
          See how our platform transforms raw information into an actionable mandate.
          Click an event to explore the synthesized intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event List Panel */}
        <Card className="col-span-1 bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="text-blue-400" />
              Incoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {demoEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedEventId(event.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  selectedEventId === event.id
                    ? 'bg-blue-600/20 border-blue-500'
                    : 'bg-slate-800/50 border-transparent hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-slate-100 pr-4">
                    <span className="text-xl mr-2">{getCountryFlag(event.country)}</span>
                    {event.headline}
                  </p>
                  <Badge className="bg-slate-900 text-slate-300">{event.score}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {format(new Date(event.date), 'MMMM d, yyyy')}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Opportunity & Analysis Panels */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedEventId}
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.1 } },
              }}
              className="space-y-6"
            >
              {/* Opportunity Dossier */}
              <motion.div variants={panelVariants}>
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="text-green-400" />
                      Actionable Opportunity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-slate-100">
                      {selectedEvent.opportunity.name}
                    </p>
                    <div className="space-y-1 mt-1">
                      <p className="text-slate-400 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {selectedEvent.opportunity.role} at{' '}
                        <strong>{selectedEvent.opportunity.company}</strong>
                      </p>
                      {selectedEvent.opportunity.email && (
                        <p className="text-blue-400 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {selectedEvent.opportunity.email}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="mt-3 text-lg border-green-500/50 text-green-300"
                    >
                      Est. Liquidity: {selectedEvent.opportunity.wealth}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>

              {/* AI Analysis */}
              <motion.div variants={panelVariants}>
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Eye className="text-purple-400" />
                      AI Analysis & Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold text-slate-300">Assessment</h4>
                      <p className="text-slate-400 italic">
                        "{selectedEvent.analysis.assessment}"
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-300">
                        Source Triangulation
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedEvent.analysis.sources.map((source) => (
                          <Button key={source.name} variant="secondary" size="sm" asChild>
                            <a
                              href={source.link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-1.5" />
                              {source.name}
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-300">Historical Context</h4>
                      <p className="text-slate-400">{selectedEvent.analysis.rag}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}