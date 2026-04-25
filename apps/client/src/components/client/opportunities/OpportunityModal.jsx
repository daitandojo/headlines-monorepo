// apps/client/src/components/client/opportunities/OpportunityModal.jsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  BookOpen,
  TrendingUp,
  Globe,
  Shield,
  DollarSign,
  Clock,
  Building,
  Users,
  Phone,
  UserCheck,
  Landmark,
} from 'lucide-react'
import { getCountryFlag, cn } from '@headlines/utils-shared'
import Link from 'next/link'
import { format } from 'date-fns'

const TRIGGER_CLASS_LABELS = {
  TC1_FAMILY_FOUNDER: { label: 'Family / Founder', color: 'text-amber-300' },
  TC2_MA_BUYER: { label: 'M&A Buyer', color: 'text-blue-300' },
  TC3_MA_SELLER: { label: 'M&A Seller', color: 'text-green-300' },
  TC4_PRIVATE_EQUITY: { label: 'Private Equity', color: 'text-purple-300' },
  TC5_LISTED_COMPANY: { label: 'Listed Company', color: 'text-slate-400' },
  TC6_REAL_ESTATE: { label: 'Real Estate', color: 'text-orange-300' },
  TC7_PHILANTHROPY: { label: 'Philanthropy', color: 'text-pink-300' },
  TC8_SUCCESSION: { label: 'Succession', color: 'text-teal-300' },
  TC9_IPO: { label: 'IPO', color: 'text-cyan-300' },
  TC10_LUXURY_ASSET: { label: 'Luxury Asset', color: 'text-yellow-300' },
  TC11_RICH_LIST: { label: 'Rich List', color: 'text-indigo-300' },
  TC12_INDIVIDUAL_LIST: { label: 'Individual List', color: 'text-rose-300' },
}

const LIQUIDITY_TYPE_LABELS = {
  exit_proceeds: 'Exit Proceeds',
  dividend: 'Dividend',
  earnout: 'Earnout',
  fundraise: 'Fundraise',
  ipo_lockup: 'IPO Lockup',
  probate: 'Probate',
  succession: 'Succession',
  management_buyout: 'Management Buyout',
  pe_exit: 'PE Exit',
  asset_sale: 'Asset Sale',
  other: 'Other',
}

const TIMING_LABELS = { past: 'Completed', pending: 'Pending', rumored: 'Rumored' }

const DOSIER_COLORS = { gold: 'text-amber-300', silver: 'text-slate-300', bronze: 'text-amber-800' }

function Section({ icon: Icon, title, children }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h4>
      {children}
    </div>
  )
}

function DetailRow({ icon: Icon, label, value, className = '' }) {
  if (!value) return null
  return (
    <div className={cn('flex items-start gap-2 text-sm', className)}>
      <Icon className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
      <span className="text-slate-400">{label}: </span>
      <span className="text-slate-100">{value}</span>
    </div>
  )
}

function OpportunityDetail({ opportunity }) {
  if (!opportunity) return null

  const { profile, accessPath, liquidityEvent, triggerClass } = opportunity
  const flags = Array.isArray(opportunity.basedIn)
    ? opportunity.basedIn.map(getCountryFlag).join(' ')
    : getCountryFlag(opportunity.basedIn || '')

  const triggerInfo = TRIGGER_CLASS_LABELS[triggerClass]
  const dossierColor = DOSIER_COLORS[profile?.dossierQuality] || DOSIER_COLORS.bronze
  const netWorth = profile?.estimatedNetWorthMM || opportunity.lastKnownEventLiquidityMM || 0
  const liqType = liquidityEvent?.type || opportunity.liquidityEvent?.type
  const liqAmount = (liquidityEvent?.estimatedAmountMM || opportunity.lastKnownEventLiquidityMM || 0)
  const liqTiming = TIMING_LABELS[liquidityEvent?.timingType || opportunity.liquidityEvent?.timingType]
  const liqDate = liquidityEvent?.dealCloseDate || opportunity.liquidityEvent?.dealCloseDate

  return (
    <div className="divide-y divide-slate-800">
      {/* Identity */}
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-bold text-xl text-slate-100 flex items-center gap-2">
              <Shield className={cn('h-5 w-5', dossierColor)} />
              {opportunity.reachOutTo}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {triggerInfo && (
                <Badge variant="outline" className={cn('text-xs', triggerInfo.color)}>
                  {triggerInfo.label}
                </Badge>
              )}
              <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                {flags} {Array.isArray(opportunity.basedIn) ? opportunity.basedIn.join(', ') : opportunity.basedIn}
              </Badge>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            {netWorth > 0 && (
              <p className="text-2xl font-bold text-green-300">${netWorth}M</p>
            )}
            {liqAmount > 0 && liqAmount !== netWorth && (
              <p className="text-sm text-slate-400">
                Event: ${liqAmount}M
                {liqTiming && <span className="ml-1 text-slate-500">({liqTiming})</span>}
              </p>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {opportunity.contactDetails?.role && opportunity.contactDetails?.company && (
            <DetailRow icon={Briefcase} label="Role" value={`${opportunity.contactDetails.role} at ${opportunity.contactDetails.company}`} />
          )}
          {opportunity.contactDetails?.email && (
            <DetailRow icon={Mail} label="Email" value={opportunity.contactDetails.email} />
          )}
          {profile?.biography && (
            <div className="col-span-2">
              <p className="text-sm text-slate-300 leading-relaxed">{profile.biography}</p>
            </div>
          )}
        </div>
      </div>

      {/* Wealth & Sector */}
      {(profile?.wealthOrigin || profile?.sector) && (
        <div className="p-4 space-y-3">
          <Section icon={TrendingUp} title="Wealth Profile">
            {profile?.wealthOrigin && (
              <DetailRow icon={TrendingUp} label="Origin" value={profile.wealthOrigin} />
            )}
            {profile?.sector && (
              <DetailRow icon={Globe} label="Sector" value={profile.sector} />
            )}
          </Section>
        </div>
      )}

      {/* Liquidity Event */}
      {(liqType || liqDate) && (
        <div className="p-4 space-y-3">
          <Section icon={DollarSign} title="Liquidity Event">
            {liqType && (
              <DetailRow icon={DollarSign} label="Type" value={LIQUIDITY_TYPE_LABELS[liqType] || liqType} />
            )}
            {liquidityEvent?.description && (
              <DetailRow icon={MessageSquare} label="Deal" value={liquidityEvent.description} />
            )}
            {liqTiming && (
              <DetailRow icon={Clock} label="Timing" value={liqTiming} />
            )}
            {liqDate && (
              <DetailRow icon={Building} label="Close Date" value={format(new Date(liqDate), 'd MMM yyyy')} />
            )}
          </Section>
        </div>
      )}

      {/* Access Path */}
      {accessPath && (
        <div className="p-4 space-y-3">
          <Section icon={Users} title="Access Path">
            {accessPath.familyOffice && (
              <DetailRow icon={Landmark} label="Family Office" value={accessPath.familyOffice} />
            )}
            {accessPath.incumbentWM && (
              <DetailRow icon={UserCheck} label="Incumbent WM" value={accessPath.incumbentWM} />
            )}
            {accessPath.primaryContact?.name && (
              <DetailRow
                icon={User}
                label="Primary Contact"
                value={`${accessPath.primaryContact.name}${accessPath.primaryContact.role ? ` (${accessPath.primaryContact.role})` : ''}`}
              />
            )}
            {Array.isArray(accessPath.conduits) && accessPath.conduits.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  Conduits
                </p>
                {accessPath.conduits.map((c, i) => (
                  <p key={i} className="text-sm text-slate-300">
                    {c.name} — {c.role}
                    {c.firm && <span className="text-slate-500"> at {c.firm}</span>}
                  </p>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {/* Why Contact */}
      {Array.isArray(opportunity.whyContact) && opportunity.whyContact.length > 0 && (
        <div className="p-4 space-y-3">
          <Section icon={MessageSquare} title="Why Contact">
            {opportunity.whyContact.map((reason, i) => (
              <p key={i} className="text-sm text-slate-300 italic">"{reason}"</p>
            ))}
          </Section>
        </div>
      )}

      {/* Related Events */}
      {opportunity.events && opportunity.events.length > 0 && (
        <div className="p-4 space-y-3">
          <Section icon={Zap} title="Related Events">
            <div className="flex flex-wrap gap-2">
              {opportunity.events.map((event) => (
                <Link key={event._id} href={`/events#${event._id}`} legacyBehavior>
                  <a>
                    <Badge variant="secondary" className="hover:bg-slate-700 cursor-pointer text-xs">
                      {event.synthesized_headline}
                      <ExternalLink className="h-3 w-3 ml-1.5" />
                    </Badge>
                  </a>
                </Link>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* Connections */}
      {opportunity.relatedIndividuals && opportunity.relatedIndividuals.length > 0 && (
        <div className="p-4 space-y-3">
          <Section icon={Users} title="Connections">
            <div className="flex flex-wrap gap-2">
              {opportunity.relatedIndividuals.map((rel, i) => (
                <Link key={i} href={rel.linkedOppId ? `/opportunities/${rel.linkedOppId}` : '#'} legacyBehavior>
                  <a className={cn(rel.linkedOppId ? 'hover:text-blue-300' : '')}>
                    <Badge variant="outline" className={cn(
                      'cursor-pointer text-xs',
                      rel.linkedOppId ? 'border-slate-600 hover:bg-slate-800' : 'border-slate-700 opacity-60'
                    )}>
                      {rel.name}
                      {rel.relationship && <span className="text-slate-500 ml-1">({rel.relationship})</span>}
                    </Badge>
                  </a>
                </Link>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}

export function OpportunityModal({ opportunities = [], open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[85vh] flex flex-col bg-slate-900 border-slate-700">
        <DialogHeader className="p-6 border-b border-slate-700">
          <DialogTitle className="text-2xl text-slate-100 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-green-400" />
            {opportunities.length === 1 ? opportunities[0].reachOutTo : 'Opportunities'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-grow min-h-0 overflow-y-auto">
          <ScrollArea className="h-full">
            {opportunities.length > 0 ? (
              opportunities.map((opp) => (
                <OpportunityDetail key={opp._id} opportunity={opp} />
              ))
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-500">
                No opportunities to display.
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}