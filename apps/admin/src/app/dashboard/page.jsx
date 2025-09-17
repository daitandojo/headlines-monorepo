// apps/admin/src/app/dashboard/page.jsx (version 2.3.0)
'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Newspaper,
  Users,
  Rss,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building,
  User,
  ShieldCheck,
  PauseCircle,
  LogIn,
  AlertCircle,
  ThumbsDown,
  Zap,
} from 'lucide-react'
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  ScrollArea,
  Button,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@headlines/ui/src/index.js'

const StatCard = ({ title, value, icon, children, href }) => (
  <Link href={href}>
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="h-full"
    >
      <Card className="bg-black/20 border-white/10 hover:border-white/20 transition-colors h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {children}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  </Link>
)

const RunFunnelStat = ({ icon: Icon, count, tooltipText, colorClass }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className={`flex items-center gap-1.5 font-mono text-sm ${colorClass}`}>
        <Icon className="h-4 w-4" />
        <span>{count}</span>
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p>{tooltipText}</p>
    </TooltipContent>
  </Tooltip>
)

const RecentRun = ({ run }) => {
  const isSuccess = !run.runStats.errors || run.runStats.errors.length === 0
  const timestamp = new Date(run.createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const { relevant, droppedErrors, droppedRelevance, events } = useMemo(() => {
    const outcomes = run.runStats.enrichmentOutcomes || []
    return {
      relevant: run.runStats.relevantHeadlines || 0,
      droppedErrors: outcomes.filter((o) => o.outcome === 'High-Signal Failure').length,
      droppedRelevance: outcomes.filter((o) => o.outcome === 'Dropped').length,
      events: run.runStats.eventsSynthesized || 0,
    }
  }, [run.runStats])

  return (
    <Link href={`/runs/${run._id}`}>
      <div className="flex items-center justify-between p-3 rounded-md hover:bg-white/5 transition-colors cursor-pointer">
        <div className="flex items-center gap-3">
          {isSuccess ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-medium truncate">
              {run.runStats.freshHeadlinesFound} headlines
            </p>
            <p className="text-xs text-muted-foreground">{timestamp}</p>
          </div>
        </div>
        <TooltipProvider delayDuration={100}>
          <div className="flex items-center gap-3">
            <RunFunnelStat
              icon={LogIn}
              count={relevant}
              tooltipText="Relevant Headlines"
              colorClass="text-slate-400"
            />
            <RunFunnelStat
              icon={AlertCircle}
              count={droppedErrors}
              tooltipText="Dropped (Enrichment Errors)"
              colorClass="text-yellow-500"
            />
            <RunFunnelStat
              icon={ThumbsDown}
              count={droppedRelevance}
              tooltipText="Dropped (Low Relevance)"
              colorClass="text-red-500"
            />
            <RunFunnelStat
              icon={Zap}
              count={events}
              tooltipText="Synthesized Events"
              colorClass="text-green-400"
            />
          </div>
        </TooltipProvider>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [runs, setRuns] = useState(null)
  const [sources, setSources] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard-stats').then((res) => res.json()),
      fetch('/api/run-verdicts').then((res) => res.json()),
      fetch('/api/sources').then((res) => res.json()), // Fetch all sources
    ])
      .then(([statsData, runsData, sourcesData]) => {
        setStats(statsData.stats)
        setRuns(runsData.verdicts)
        setSources(sourcesData.sources)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setIsLoading(false)
      })
  }, [])

  const failingSources = useMemo(() => {
    if (!sources) return []
    return sources.filter(
      (s) =>
        s.status === 'active' &&
        s.analytics?.totalRuns > 0 &&
        s.analytics?.lastRunHeadlineCount === 0
    )
  }, [sources])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin gemini-text" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      <div className="flex-shrink-0">
        <PageHeader
          title="Dashboard"
          description="At-a-glance overview of the pipeline's configuration and health."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
          <StatCard
            title="Sources"
            value={stats?.sources.active}
            href="/sources?status=failing"
            icon={<Newspaper className="h-5 w-5 text-muted-foreground" />}
          >
            <span>{stats?.sources.total} total</span>
            <span className="text-yellow-400 flex items-center gap-1">
              <PauseCircle className="h-3 w-3" /> {stats?.sources.paused} paused
            </span>
            <span className="text-red-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {stats?.sources.failing} failing
            </span>
          </StatCard>
          <StatCard
            title="Users"
            value={stats?.users.active}
            href="/users"
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
          >
            <span>{stats?.users.total} total</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> {stats?.users.admin} admin(s)
            </span>
          </StatCard>
          <StatCard
            title="Watchlist"
            value={stats?.watchlist.total}
            href="/watchlist"
            icon={<Rss className="h-5 w-5 text-muted-foreground" />}
          >
            <span className="flex items-center gap-1">
              <Building className="h-3 w-3" /> {stats?.watchlist.company} companies
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />{' '}
              {stats?.watchlist.person + stats?.watchlist.family} people
            </span>
          </StatCard>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-10 grid gap-10 lg:grid-cols-2 flex-grow min-h-0"
      >
        <Card className="bg-black/20 border-white/10 flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current health of active data sources.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col min-h-0">
            {failingSources.length > 0 ? (
              <div className="space-y-3 flex flex-col flex-grow min-h-0">
                <div className="flex items-center gap-3 text-red-400 flex-shrink-0">
                  <AlertTriangle />
                  <p className="font-semibold">
                    {failingSources.length} active source(s) are failing.
                  </p>
                </div>
                <div className="flex-grow min-h-0">
                  <ScrollArea className="h-full rounded-md border bg-background/50 p-2">
                    <ul className="space-y-1">
                      {failingSources.map((s) => (
                        <li key={s._id}>
                          <Link href={`/sources?action=edit&sourceId=${s._id}`}>
                            <Button variant="ghost" className="w-full justify-start h-8">
                              {s.name}
                            </Button>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-green-400">
                <CheckCircle2 />
                <p className="font-semibold">
                  All systems nominal. All active sources are healthy.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10 flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle>Recent Pipeline Runs</CardTitle>
            <CardDescription>
              Performance funnel for the last 5 executions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow min-h-0">
            <ScrollArea className="h-full">
              {runs && runs.length > 0 ? (
                <div className="space-y-2">
                  {runs.map((run) => (
                    <RecentRun key={run._id} run={run} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-4">
                  No recent pipeline runs found.
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
