// File: apps/client/src/components/client/opportunities/OpportunityModal.jsx

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
  User,
  Briefcase,
  MapPin,
  Mail,
  Zap,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'
import { getCountryFlag } from '@headlines/utils-shared'
import Link from 'next/link'

function OpportunityDetail({ opportunity }) {
  if (!opportunity) return null

  const flags = (opportunity.basedIn || []).map((c) => getCountryFlag(c)).join(' ')
  const reasonsToContact = Array.isArray(opportunity.whyContact)
    ? opportunity.whyContact
    : [opportunity.whyContact]

  return (
    <div className="p-4 border-b border-slate-700 last:border-b-0">
      {/* Header */}
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex-1 space-y-1">
          <p className="font-bold text-lg text-slate-100 flex items-center gap-2">
            <User className="h-5 w-5 text-slate-400" />
            {opportunity.reachOutTo}
          </p>
          <div className="pl-7 space-y-1 text-sm text-slate-400">
            {opportunity.contactDetails?.role && opportunity.contactDetails?.company && (
              <p className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-slate-500" />
                <span>
                  {opportunity.contactDetails.role} at{' '}
                  <strong>{opportunity.contactDetails.company}</strong>
                </span>
              </p>
            )}
            {(opportunity.city || opportunity.basedIn?.length > 0) && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500" />
                <span className="text-base mr-1">{flags}</span>
                {opportunity.city}
                {opportunity.city && opportunity.basedIn?.length > 0 ? ', ' : ''}
                {(opportunity.basedIn || []).join(', ')}
              </p>
            )}
            {opportunity.contactDetails?.email && (
              <a
                href={`mailto:${opportunity.contactDetails.email}`}
                className="flex items-center gap-2 text-blue-400 hover:underline"
              >
                <Mail className="h-4 w-4 text-slate-500" />
                {opportunity.contactDetails.email}
              </a>
            )}
          </div>
        </div>
        {opportunity.likelyMMDollarWealth > 0 && (
          <Badge
            variant="outline"
            className="text-base border-green-500/50 text-green-300"
          >
            ${opportunity.likelyMMDollarWealth}M
          </Badge>
        )}
      </div>

      {/* Why Contact */}
      <div className="space-y-2 mb-3">
        {reasonsToContact.map((reason, index) => (
          <div
            key={index}
            className="flex items-start gap-2 text-sm text-slate-300 italic"
          >
            <MessageSquare className="h-4 w-4 mt-0.5 text-slate-500 flex-shrink-0" />
            <p>“{reason}”</p>
          </div>
        ))}
      </div>

      {/* Related Events */}
      {opportunity.events && opportunity.events.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-slate-400 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Related Events
          </h4>
          <div className="flex flex-wrap gap-2">
            {opportunity.events.map((event) => (
              <Link href={`/events#${event._id}`} key={event._id} legacyBehavior>
                <a className="block">
                  <Badge
                    variant="secondary"
                    className="hover:bg-slate-700 cursor-pointer"
                  >
                    {event.synthesized_headline}
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                  </Badge>
                </a>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function OpportunityModal({ opportunities = [], open, onOpenChange }) {
  const opportunityCount = opportunities.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[95vw] h-[80vh] flex flex-col bg-slate-900 border-slate-700">
        <DialogHeader className="p-6 border-b border-slate-700">
          <DialogTitle className="text-2xl text-slate-100 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-green-400" />
            Actionable Opportunities
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {opportunityCount > 0
              ? `Found ${opportunityCount} opportunity${opportunityCount > 1 ? 's' : ''} matching the criteria.`
              : 'No opportunities found.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full">
            {opportunityCount > 0 ? (
              opportunities.map((opp) => (
                <OpportunityDetail key={opp._id} opportunity={opp} />
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>No opportunities to display.</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
