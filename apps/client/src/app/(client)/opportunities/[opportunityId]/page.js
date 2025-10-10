// apps/client/src/app/(client)/opportunities/[opportunityId]/page.js
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from '@/components/shared'
import { ArrowLeft, User, MapPin, Briefcase, Mail, Zap, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { getCountryFlag } from '@headlines/utils-shared'

function TimelineItem({ event, isLast }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 bg-blue-500 rounded-full ring-4 ring-slate-800"></div>
        {!isLast && <div className="flex-grow w-px bg-slate-700"></div>}
      </div>
      <div className="flex-grow pb-8">
        <p className="text-xs text-slate-400">
          {format(new Date(event.createdAt), 'MMMM d, yyyy')}
        </p>
        <h3 className="font-semibold text-slate-100 mt-1">
          {event.synthesized_headline}
        </h3>
        <p className="text-sm text-slate-400 mt-1">{event.synthesized_summary}</p>
        <div className="mt-2 flex flex-wrap gap-2">
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
    </div>
  )
}

export default async function OpportunityDossierPage({ params }) {
  const { opportunityId } = params

  let opportunity = null

  try {
    // ✅ Fetch through API route
    const url = new URL(
      `/api/opportunities/${opportunityId}`,
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    )

    const response = await fetch(url.toString(), {
      headers: {
        cookie: cookies().toString(),
      },
    })

    if (!response.ok) {
      notFound()
    }

    const result = await response.json()

    if (!result.success || !result.data) {
      notFound()
    }

    opportunity = result.data
  } catch (err) {
    console.error('[OpportunityDossierPage] Failed to fetch opportunity:', err.message)
    notFound()
  }

  const { contactDetails } = opportunity
  const flags = (opportunity.basedIn || []).map((c) => getCountryFlag(c)).join(' ')

  return (
    <div className="max-w-4xl mx-auto">
      <Button asChild variant="ghost" className="mb-4">
        <Link href="/opportunities">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Opportunities
        </Link>
      </Button>
      <Card className="bg-slate-900/50 border-slate-700/80">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold flex items-center gap-3">
                <User className="h-8 w-8 text-slate-400" />
                {opportunity.reachOutTo}
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                {contactDetails?.role && contactDetails?.company && (
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {contactDetails.role} at <strong>{contactDetails.company}</strong>
                  </span>
                )}
              </CardDescription>
            </div>
            {opportunity.likelyMMDollarWealth > 0 && (
              <Badge
                variant="outline"
                className="text-lg border-green-500/50 text-green-300"
              >
                Est. ${opportunity.likelyMMDollarWealth}M
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-4 text-sm text-slate-300">
            {(opportunity.city || opportunity.basedIn) && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500" />
                <span className="text-xl mr-1">{flags}</span>
                {opportunity.city}
                {opportunity.city && opportunity.basedIn?.length > 0 ? ', ' : ''}
                {(opportunity.basedIn || []).join(', ')}
              </span>
            )}
            {contactDetails?.email && (
              <a
                href={`mailto:${contactDetails.email}`}
                className="flex items-center gap-2 text-blue-400 hover:underline"
              >
                <Mail className="h-4 w-4 text-slate-500" />
                {contactDetails.email}
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-blue-400" />
              Event Timeline
            </h3>
            <div className="relative">
              {(opportunity.events || []).map((event, index) => (
                <TimelineItem
                  key={event._id}
                  event={event}
                  isLast={index === opportunity.events.length - 1}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
