// apps/admin/src/app/runs/[runId]/page.js (version 1.0)
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Loader2,
  ServerCrash,
  CheckCircle2,
  AlertTriangle,
  BotMessageSquare,
  Newspaper,
  Users,
  Rss,
  ArrowLeft,
  Database,
  Globe,
  BookOpen,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@headlines/ui'
import { Badge } from '@headlines/ui'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@headlines/ui'
import { Button } from '@headlines/ui'

const StatCard = ({ title, value, icon }) => (
  <Card className="bg-black/20 border-white/10">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
)

const EnrichmentSourceIcons = ({ sources = [] }) => {
  const iconMap = {
    rag_db: { icon: Database, tooltip: 'RAG / Historical DB' },
    wikipedia: { icon: Globe, tooltip: 'Wikipedia' },
    news_api: { icon: BookOpen, tooltip: 'NewsAPI' },
  }
  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        {sources.map((sourceKey) => {
          const IconComponent = iconMap[sourceKey]?.icon
          if (!IconComponent) return null
          return (
            <Tooltip key={sourceKey}>
              <TooltipTrigger>
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Enriched with {iconMap[sourceKey].tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </TooltipProvider>
    </div>
  )
}

const VerdictCard = ({ items, title }) => (
  <Card className="bg-black/20 border-white/10">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {items && items.length > 0 ? (
        items.map((item, index) => {
          const quality = item.quality?.toLowerCase() || 'n/a'
          let colorClass = 'bg-gray-500/20 text-gray-400'
          if (quality === 'excellent' || quality === 'good')
            colorClass = 'bg-green-500/20 text-green-400'
          if (quality === 'poor' || quality === 'irrelevant')
            colorClass = 'bg-red-500/20 text-red-400'

          return (
            <div
              key={index}
              className="text-sm p-3 rounded-md bg-background/50 border border-white/10"
            >
              <div className="flex justify-between items-start">
                <p className="font-semibold pr-4">{item.identifier}</p>
                <Badge className={`capitalize ${colorClass}`}>{item.quality}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 italic">
                `{item.commentary}`
              </p>
              {item.enrichmentSources && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <EnrichmentSourceIcons sources={item.enrichmentSources} />
                </div>
              )}
            </div>
          )
        })
      ) : (
        <p className="text-sm text-muted-foreground">
          No {title.toLowerCase()} were judged in this run.
        </p>
      )}
    </CardContent>
  </Card>
)

export default function RunDetailsPage({ params }) {
  const { runId } = params
  const [verdict, setVerdict] = useState(null)
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!runId) return
    setIsLoading(true)
    fetch(`/api/run-verdicts/${runId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`)
        return res.json()
      })
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setVerdict(data.verdict)
        if (
          !data.verdict.judgeVerdict ||
          (!data.verdict.judgeVerdict.event_judgements &&
            !data.verdict.judgeVerdict.opportunity_judgements)
        ) {
          setSummary('No judge verdict was generated for this run.')
          return Promise.resolve(null)
        }
        return fetch('/api/ai/executive-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ judgeVerdict: data.verdict.judgeVerdict }),
        })
      })
      .then((res) => (res ? res.json() : null))
      .then((data) => {
        if (data && data.summary) setSummary(data.summary)
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [runId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin gemini-text" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-center p-4">
        <div className="p-8 rounded-lg bg-destructive/10 border border-destructive/50 max-w-md">
          <ServerCrash className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold">Failed to Load Run Details</h1>
          <p className="text-destructive-foreground/80 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  const runDate = new Date(verdict.createdAt).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'long',
  })
  const isSuccess = !verdict.runStats.errors || verdict.runStats.errors.length === 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Button asChild variant="ghost" className="mb-4">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
      <Card className="bg-black/20 border-white/10 mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Pipeline Run Details</CardTitle>
              <CardDescription>{runDate}</CardDescription>
            </div>
            {isSuccess ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-base">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Success
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-base">
                <AlertTriangle className="mr-2 h-4 w-4" /> Failed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Headlines Found"
            value={verdict.runStats.freshHeadlinesFound}
            icon={<Newspaper className="h-5 w-5 text-muted-foreground" />}
          />
          <StatCard
            title="Events Synthesized"
            value={verdict.runStats.eventsSynthesized}
            icon={<Rss className="h-5 w-5 text-muted-foreground" />}
          />
          <StatCard
            title="Opportunities Generated"
            value={(verdict.generatedOpportunities || []).length}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
          />
          <StatCard
            title="Errors"
            value={verdict.runStats.errors?.length || 0}
            icon={<AlertTriangle className="h-5 w-5 text-muted-foreground" />}
          />
        </CardContent>
      </Card>
      <Card className="bg-black/20 border-white/10 mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BotMessageSquare className="h-6 w-6 gemini-text" /> AI Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground italic">
          {summary ? `"${summary}"` : <Loader2 className="h-5 w-5 animate-spin" />}
        </CardContent>
      </Card>
      <div className="grid gap-8 md:grid-cols-2">
        <VerdictCard
          items={verdict.judgeVerdict?.event_judgements || []}
          title="Judged Events"
        />
        <VerdictCard
          items={verdict.judgeVerdict?.opportunity_judgements || []}
          title="Judged Opportunities"
        />
      </div>
    </motion.div>
  )
}
