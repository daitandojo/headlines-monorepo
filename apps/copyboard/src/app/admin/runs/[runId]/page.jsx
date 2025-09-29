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
  Button,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shared'
import { format } from 'date-fns'

const StatCard = ({ title, value, icon }) => (
  <Card>
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
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {items && items.length > 0 ? (
        items.map((item, index) => {
          const quality = item.quality?.toLowerCase() || 'n/a'
          let colorClass = 'bg-gray-500/20 text-gray-400 border-gray-500/30'
          if (quality === 'excellent' || quality === 'good')
            colorClass = 'bg-green-500/20 text-green-400 border-green-500/30'
          if (quality === 'poor' || quality === 'irrelevant')
            colorClass = 'bg-red-500/20 text-red-400 border-red-500/30'
          return (
            <div key={index} className="text-sm p-3 rounded-md bg-secondary">
              <div className="flex justify-between items-start">
                <p className="font-semibold pr-4">{item.identifier}</p>
                <Badge className={`capitalize ${colorClass}`}>{item.quality}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 italic">
                `{item.commentary}`
              </p>
              {item.enrichmentSources && (
                <div className="mt-2 pt-2 border-t border-border">
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

    async function fetchData() {
      try {
        const verdictRes = await fetch(`/api-admin/run-verdicts/${runId}`)
        if (!verdictRes.ok)
          throw new Error(`API Error: ${verdictRes.status} ${verdictRes.statusText}`)
        const verdictData = await verdictRes.json()
        if (verdictData.error) throw new Error(verdictData.error)
        setVerdict(verdictData.verdict)

        if (!verdictData.verdict.judgeVerdict) {
          setSummary('No judge verdict was generated for this run.')
          return
        }

        const summaryRes = await fetch('/api-admin/ai-admin/executive-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            judgeVerdict: verdictData.verdict.judgeVerdict,
            freshHeadlinesFound: verdictData.verdict.runStats.freshHeadlinesFound,
          }),
        })
        const summaryData = await summaryRes.json()
        if (summaryData.summary) setSummary(summaryData.summary)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [runId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="p-8 rounded-lg bg-destructive/10 border border-destructive/50 text-center">
        <ServerCrash className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Failed to Load Run Details</h1>
        <p className="text-destructive-foreground/80 mt-2">{error}</p>
      </div>
    )
  }

  const runDate = new Date(verdict.createdAt).toLocaleString()
  const isSuccess = !verdict.runStats.errors || verdict.runStats.errors.length === 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Button asChild variant="ghost" className="mb-4">
        <Link href="/admin/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
      <Card className="mb-8">
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
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BotMessageSquare className="h-6 w-6 text-primary" /> AI Executive Summary
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
