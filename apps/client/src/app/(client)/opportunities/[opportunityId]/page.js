// apps/client/src/app/(client)/opportunities/[opportunityId]/page.js
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import Image from 'next/image'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Separator,
  Tabs, // ADDED
  TabsContent, // ADDED
  TabsList, // ADDED
  TabsTrigger, // ADDED
} from '@/components/shared'
import { NetworkExplorer } from '@/components/client/opportunities/NetworkExplorer' // ADDED
import {
  ArrowLeft,
  User,
  MapPin,
  Briefcase,
  Mail,
  Zap,
  ExternalLink,
  BookOpen,
  Users,
  Heart,
  Award,
  Gamepad2,
  Gift,
  Building,
  Share2, // ADDED
} from 'lucide-react'
import { format } from 'date-fns'
import { getCountryFlag } from '@headlines/utils-shared'

const InfoItem = ({ icon, label, children, className = '' }) => {
  // ... (unchanged)
  const Icon = icon
  const content =
    children && (!Array.isArray(children) || children.length > 0) ? (
      children
    ) : (
      <span className="text-slate-500 italic text-sm">Not Reported</span>
    )

  return (
    <div className={className}>
      <h4 className="text-sm font-semibold text-slate-400 mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </h4>
      <div className="text-slate-300 text-sm pl-6">{content}</div>
    </div>
  )
}

const TagList = ({ items }) => {
  // ... (unchanged)
  if (!items || items.length === 0) {
    return <span className="text-slate-500 italic text-sm">Not Reported</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant="secondary" className="font-normal text-xs">
          {item}
        </Badge>
      ))}
    </div>
  )
}

const TimelineItem = ({ event, isLast }) => (
  // ... (unchanged)
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className="w-3 h-3 bg-blue-500 rounded-full ring-4 ring-slate-800/50"></div>
      {!isLast && <div className="flex-grow w-px bg-slate-700"></div>}
    </div>
    <div className="flex-grow pb-6">
      <p className="text-xs text-slate-400">
        {format(new Date(event.createdAt), 'MMMM d, yyyy')}
      </p>
      <h3 className="font-semibold text-slate-100 mt-1 text-sm">
        {event.synthesized_headline}
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {(event.source_articles || []).map((article) => (
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            key={article.link}
          >
            <Badge variant="secondary" className="hover:bg-slate-700 font-normal text-xs">
              {article.newspaper}
              <ExternalLink className="h-3 w-3 ml-1.5" />
            </Badge>
          </a>
        ))}
      </div>
    </div>
  </div>
)

export default async function OpportunityDossierPage({ params }) {
  const { opportunityId } = params
  let opportunity = null
  try {
    const url = new URL(
      `/api/opportunities/${opportunityId}`,
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    )
    const response = await fetch(url.toString(), {
      headers: { cookie: cookies().toString() },
    })
    if (!response.ok) notFound()
    const result = await response.json()
    if (!result.success || !result.data) notFound()
    opportunity = result.data
  } catch (err) {
    console.error('[OpportunityDossierPage] Failed to fetch opportunity:', err.message)
    notFound()
  }

  const { contactDetails, profile = {} } = opportunity
  const basedInArray = Array.isArray(opportunity.basedIn)
    ? opportunity.basedIn
    : [opportunity.basedIn].filter(Boolean)
  const flags = basedInArray.map(getCountryFlag).join(' ')
  const age = profile.yearOfBirth ? new Date().getFullYear() - profile.yearOfBirth : null
  const totalNetWorth = profile.estimatedNetWorthMM || 0

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col h-[calc(100vh-100px)]">
      <div className="flex-shrink-0">
        <Button asChild variant="ghost" className="mb-4 -ml-4">
          <Link href="/opportunities">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Opportunities
          </Link>
        </Button>
      </div>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* === LEFT COLUMN: ALL PROFILE DATA === */}
        <div className="lg:col-span-1 flex flex-col">
          <Card className="bg-slate-900/50 border-slate-700/80 flex-grow flex flex-col">
            <CardHeader className="items-center text-center">
              {profile.profilePhotoUrl ? (
                <div className="relative h-28 w-28 rounded-full overflow-hidden border-2 border-slate-700">
                  <Image
                    src={profile.profilePhotoUrl}
                    alt={opportunity.reachOutTo}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-28 w-28 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700">
                  <User className="h-12 w-12 text-slate-500" />
                </div>
              )}
              <CardTitle className="text-2xl pt-2">{opportunity.reachOutTo}</CardTitle>
              <CardDescription>
                {contactDetails?.role || 'Role Not Reported'} at{' '}
                <strong>{contactDetails?.company || 'Company Not Reported'}</strong>
              </CardDescription>
              <div className="flex items-center flex-wrap justify-center gap-2 pt-2">
                <Badge variant="outline">{age ? `Age: ${age}` : 'Age: N/A'}</Badge>
                <Badge
                  variant="outline"
                  className={
                    totalNetWorth > 0 ? 'border-green-500/50 text-green-300' : ''
                  }
                >
                  Est. Net Worth: {totalNetWorth > 0 ? `$${totalNetWorth}M` : 'N/A'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-grow overflow-y-auto custom-scrollbar pr-4 text-sm space-y-4">
              <div className="space-y-4">
                <InfoItem icon={MapPin} label="Location">
                  {basedInArray.join(', ')}
                </InfoItem>
                <InfoItem icon={Mail} label="Email">
                  {contactDetails?.email ? (
                    <a
                      href={`mailto:${contactDetails.email}`}
                      className="text-blue-400 hover:underline"
                    >
                      {contactDetails.email}
                    </a>
                  ) : (
                    <span className="text-slate-500 italic">Not Reported</span>
                  )}
                </InfoItem>
                <InfoItem icon={BookOpen} label="Wealth Origin">
                  {profile.wealthOrigin || (
                    <span className="text-slate-500 italic">Not Reported</span>
                  )}
                </InfoItem>
              </div>
              <Separator className="my-4 bg-slate-700/50" />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Profile Details</h3>
                <InfoItem icon={Building} label="Family Office">
                  {profile.familyOffice?.name}{' '}
                  {profile.familyOffice?.officer &&
                    `(Contact: ${profile.familyOffice.officer})`}
                </InfoItem>
                <InfoItem icon={Award} label="Asset Allocation">
                  {profile.assetAllocation}
                </InfoItem>
                <InfoItem icon={Zap} label="Investment Interests">
                  <TagList items={profile.investmentInterests} />
                </InfoItem>
                <InfoItem icon={Briefcase} label="Direct Investments">
                  <TagList items={profile.directInvestments} />
                </InfoItem>
                <InfoItem icon={Heart} label="Philanthropy">
                  <TagList items={profile.philanthropicInterests} />
                </InfoItem>
                <InfoItem icon={Gamepad2} label="Hobbies">
                  <TagList items={profile.hobbies} />
                </InfoItem>
                <InfoItem icon={Gift} label="Special Interests">
                  <TagList items={profile.specialInterests} />
                </InfoItem>
                <InfoItem icon={Users} label="Children">
                  <TagList items={profile.children} />
                </InfoItem>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* === RIGHT COLUMN: NARRATIVE & TIMELINE (NOW TABBED) === */}
        <div className="lg:col-span-1 flex flex-col gap-6 min-h-0">
          <Tabs defaultValue="biography" className="flex-grow flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="biography">
                <BookOpen className="w-4 h-4 mr-2" />
                Biography
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <Zap className="w-4 h-4 mr-2" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="network">
                <Share2 className="w-4 h-4 mr-2" />
                Network
              </TabsTrigger>
            </TabsList>

            <TabsContent value="biography" className="flex-grow mt-4 min-h-0">
              <Card className="bg-slate-900/50 border-slate-700/80 flex-grow flex flex-col h-full">
                <CardContent className="flex-grow overflow-y-auto custom-scrollbar p-6">
                  <p className="text-slate-300 whitespace-pre-line text-base leading-relaxed pr-2">
                    {profile.biography || (
                      <span className="text-slate-500 italic">
                        No biography available.
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="flex-grow mt-4 min-h-0">
              <Card className="bg-slate-900/50 border-slate-700/80 flex-grow flex flex-col h-full">
                <CardContent className="flex-grow overflow-y-auto custom-scrollbar p-6">
                  <div className="relative pr-4">
                    {(opportunity.events || []).length > 0 ? (
                      (opportunity.events || []).map((event, index) => (
                        <TimelineItem
                          key={event._id}
                          event={event}
                          isLast={index === opportunity.events.length - 1}
                        />
                      ))
                    ) : (
                      <p className="text-slate-500 italic text-center py-8">
                        No associated events.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="network" className="flex-grow mt-4 min-h-0">
              <Card className="bg-slate-900/50 border-slate-700/80 flex-grow flex flex-col h-full">
                <CardContent className="flex-grow overflow-y-auto custom-scrollbar p-6">
                  <NetworkExplorer entityName={opportunity.reachOutTo} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
