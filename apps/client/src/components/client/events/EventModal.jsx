// apps/client/src/components/client/events/EventModal.jsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ScrollArea,
  Badge,
} from '@/components/shared'
import {
  Zap,
  Users,
  Mail,
  Briefcase,
  Building,
  ExternalLink,
  AlertCircle,
  FileText, // NEW
  DollarSign, // NEW
  Percent, // NEW
  ArrowRight, // NEW
} from 'lucide-react'
import { getCountryFlag } from '@headlines/utils-shared'

function TransactionDetail({ label, value, icon, unit = '' }) {
  if (value === null || value === undefined) return null
  const Icon = icon
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-slate-500" />
      <span className="font-medium text-slate-400">{label}:</span>
      <span className="font-semibold text-slate-200">
        {value}
        {unit}
      </span>
    </div>
  )
}

function EventDetail({ event }) {
  if (!event) return null

  const flags = Array.isArray(event.country)
    ? event.country.map(getCountryFlag).join(' ')
    : getCountryFlag(event.country)
  const score = event.highest_relevance_score || 0
  const { transactionDetails, primarySubject, relatedCompanies, tags } = event

  const getRelevanceBadgeClass = (score) => {
    if (score >= 90) return 'bg-red-500/20 text-red-300 border border-red-500/30'
    if (score >= 75) return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    return 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
  }

  return (
    <div className="p-4 border-b border-slate-700 last:border-b-0 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 space-y-2">
          <h3 className="font-serif font-bold text-lg text-slate-100 leading-tight">
            {flags && <span className="text-xl mr-2 align-middle">{flags}</span>}
            {event.synthesized_headline}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {event.eventClassification && (
              <Badge
                variant="outline"
                className="border-yellow-500/30 text-yellow-300 bg-yellow-500/10"
              >
                {event.eventClassification}
              </Badge>
            )}
            {tags &&
              tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="capitalize">
                  {tag}
                </Badge>
              ))}
          </div>
        </div>
        <Badge
          className={`text-base font-bold px-3 py-1 ${getRelevanceBadgeClass(score)}`}
        >
          {score}
        </Badge>
      </div>

      {/* Summary */}
      <p className="text-sm text-slate-300 leading-relaxed">
        {event.synthesized_summary || 'No summary available.'}
      </p>

      {/* NEW: Transaction Details Section */}
      {transactionDetails && (
        <div className="p-3 bg-slate-800/30 rounded-md border border-slate-700/50 space-y-2 text-sm">
          <h4 className="font-semibold text-sm text-slate-400 mb-1">
            Transaction Details
          </h4>
          <TransactionDetail
            label="Type"
            value={transactionDetails.transactionType}
            icon={FileText}
          />
          <TransactionDetail
            label="Valuation"
            value={transactionDetails.valuationAtEventUSD}
            icon={DollarSign}
            unit="M USD"
          />
          <TransactionDetail
            label="Ownership Change"
            value={transactionDetails.ownershipPercentageChange}
            icon={Percent}
            unit="%"
          />
          {transactionDetails.liquidityFlow?.nature && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50 mt-2">
              <ArrowRight className="h-4 w-4 text-slate-500" />
              <span className="font-medium text-slate-400">Flow:</span>
              <span className="font-semibold text-slate-200">
                {transactionDetails.liquidityFlow.nature} (~$
                {transactionDetails.liquidityFlow.approxAmountUSD}M)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Advisor Summary */}
      {event.advisorSummary && (
        <div className="flex items-start gap-2 text-xs text-slate-500 italic p-2 bg-slate-800/30 rounded-md">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{event.advisorSummary}</p>
        </div>
      )}

      {/* Key Individuals */}
      {event.key_individuals?.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-slate-400">Key Individuals</h4>
          {event.key_individuals.map((person, index) => (
            <div key={index} className="p-2 rounded-md bg-slate-800/50 text-sm">
              <p className="font-semibold text-slate-200 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" /> {person.name}
              </p>
              <div className="pl-6 space-y-1 mt-1 text-slate-400">
                {person.role_in_event && (
                  <p className="flex items-center gap-2 text-xs">
                    <Briefcase className="h-3 w-3" /> {person.role_in_event}
                  </p>
                )}
                {person.company && (
                  <p className="flex items-center gap-2 text-xs">
                    <Building className="h-3 w-3" /> {person.company}
                  </p>
                )}
                {person.email_suggestion && (
                  <a
                    href={`mailto:${person.email_suggestion}`}
                    className="flex items-center gap-2 text-xs text-blue-400 hover:underline"
                  >
                    <Mail className="h-3 w-3" /> {person.email_suggestion}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Source Articles & Related Companies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {event.source_articles?.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm text-slate-400 mb-2">Source Articles</h4>
            <div className="flex flex-wrap gap-2">
              {event.source_articles.map((article) => (
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={article.link}
                >
                  <Badge variant="secondary" className="hover:bg-slate-700">
                    {article.newspaper}
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        )}
        {relatedCompanies?.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm text-slate-400 mb-2">
              Related Companies
            </h4>
            <div className="flex flex-wrap gap-2">
              {relatedCompanies.map((company) => (
                <Badge key={company} variant="outline">
                  {company}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function EventModal({ events = [], open, onOpenChange }) {
  const eventCount = events.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-[95vw] h-[80vh] flex flex-col bg-slate-900 border-slate-700">
        <DialogHeader className="p-6 border-b border-slate-700">
          <DialogTitle className="text-2xl text-slate-100 flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-400" />
            Synthesized Events
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {eventCount > 0
              ? `Displaying ${eventCount} event${eventCount > 1 ? 's' : ''}.`
              : 'No events found.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full">
            {eventCount > 0 ? (
              events.map((event) => <EventDetail key={event._id} event={event} />)
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>No events to display.</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
