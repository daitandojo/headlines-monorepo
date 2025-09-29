// apps/admin/src/app/(protected)/dashboard/DashboardClientPage.jsx (version 1.0.2 - Complete)
'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Newspaper, Users, Rss, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
} from '@components/shared'
import { formatDistanceToNow } from 'date-fns'

const StatCard = ({ title, value, icon, link }) => (
  <Card asChild>
    <Link href={link}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Link>
  </Card>
)

const RunFunnelStat = ({ title, value, className }) => (
  <div className={`text-center p-2 rounded-md ${className}`}>
    <p className="text-xl font-bold">{value.toLocaleString()}</p>
    <p className="text-xs text-muted-foreground">{title}</p>
  </div>
)

const RecentRun = ({ run }) => {
  const isSuccess = !run.runStats.errors || run.runStats.errors.length === 0
  return (
    <Link
      href={`/runs/${run._id}`}
      className="flex items-center justify-between p-3 rounded-md hover:bg-accent transition-colors"
    >
      <div className="flex items-center gap-3">
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
        )}
        <div>
          <p className="font-medium">
            Found {run.runStats.freshHeadlinesFound} headlines, synthesized{' '}
            {run.runStats.eventsSynthesized} events.
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm">
        Details
      </Button>
    </Link>
  )
}

export default function DashboardClientPage({
  initialStats,
  initialRuns,
  initialSources,
}) {
  const [stats] = useState(initialStats)
  const [runs] = useState(initialRuns)
  const [sources] = useState(initialSources)

  const failingSources = useMemo(() => {
    if (!sources) return []
    return sources.filter(
      (s) =>
        s.status === 'active' &&
        s.analytics?.totalRuns > 0 &&
        s.analytics?.lastRunHeadlineCount === 0
    )
  }, [sources])

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin gemini-text" />
      </div>
    )
  }

  const lastRunStats = runs?.[0]?.runStats || {}

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <PageHeader
        title="Admin Dashboard"
        description="High-level overview of system health and content pipeline."
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Sources"
          value={`${stats.sources.active} / ${stats.sources.total}`}
          icon={<Newspaper className="h-5 w-5 text-muted-foreground" />}
          link="/sources"
        />
        <StatCard
          title="Active Users"
          value={`${stats.users.active} / ${stats.users.total}`}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          link="/users"
        />
        <StatCard
          title="Watchlist Entities"
          value={stats.watchlist.total}
          icon={<Rss className="h-5 w-5 text-muted-foreground" />}
          link="/watchlist"
        />
        <StatCard
          title="Failing Sources"
          value={failingSources.length}
          icon={<AlertTriangle className="h-5 w-5 text-muted-foreground" />}
          link="/sources?status=failing"
        />
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Pipeline Runs</CardTitle>
            <CardDescription>
              Summary of the last 5 intelligence gathering runs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {runs && runs.length > 0 ? (
              <div className="space-y-2">
                {runs.map((run) => (
                  <RecentRun key={run._id} run={run} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent runs found.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last Run Funnel</CardTitle>
            <CardDescription>
              Conversion metrics from the most recent pipeline execution.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <RunFunnelStat
              title="Headlines Found"
              value={lastRunStats.freshHeadlinesFound || 0}
              className="bg-blue-500/10"
            />
            <RunFunnelStat
              title="Relevant Headlines"
              value={lastRunStats.relevantHeadlines || 0}
              className="bg-yellow-500/10"
            />
            <RunFunnelStat
              title="Events Synthesized"
              value={lastRunStats.eventsSynthesized || 0}
              className="bg-purple-500/10"
            />
            <RunFunnelStat
              title="Notifications Sent"
              value={lastRunStats.eventsEmailed || 0}
              className="bg-green-500/10"
            />
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
