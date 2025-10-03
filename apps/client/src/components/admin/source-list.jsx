// apps/admin/src/app/_components/source-list.jsx (version 3.0.0)
'use client'

import { useState, useMemo } from 'react'
import {
  Button,
  Input,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@/components/shared'
import {
  PlusCircle,
  DatabaseZap,
  ServerCrash,
  Newspaper,
  ShieldAlert,
  Loader2,
  Ban,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@headlines/utils-shared'

function DynamicStatus({ source, status }) {
  if (status?.checking) {
    return <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
  }
  if (status && typeof status.count === 'number') {
    if (status.count > 0) {
      return (
        <Badge
          variant="secondary"
          className="bg-green-500/20 text-green-400 border-green-500/30"
        >
          {status.count}
        </Badge>
      )
    }
    return <Badge variant="destructive">{status.count}</Badge>
  }
  return <SourceStatusIndicator source={source} />
}

function SourceStatusIndicator({ source }) {
  let status = 'healthy'
  let title = 'Healthy'

  if (source.status === 'paused') {
    status = 'paused'
    title = 'Paused'
  } else if (source.status === 'under_review') {
    status = 'under_review'
    title = 'Under Review'
  } else if (
    source.analytics?.totalRuns > 0 &&
    source.analytics?.lastRunHeadlineCount === 0
  ) {
    status = 'failed'
    title = 'Failing: Last run found 0 headlines.'
  }

  const color = {
    paused: 'bg-gray-500',
    under_review: 'bg-yellow-500',
    failed: 'bg-red-500',
    healthy: 'bg-green-500',
  }[status]

  return (
    <div
      className={cn('w-2 h-2 rounded-full flex-shrink-0 transition-colors', color)}
      title={title}
    />
  )
}

export default function SourceList({
  sources,
  isLoading,
  selectedSourceId,
  onSelectSource,
  onAddSource,
  onCheckFiltered,
  onStopCheck,
  isCheckingAll,
  liveStatuses,
  countries,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [countryFilter, setCountryFilter] = useState('all')

  const filteredSources = useMemo(() => {
    if (!sources) return []
    return sources
      .filter((source) => countryFilter === 'all' || source.country === countryFilter)
      .filter((source) => source.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [sources, searchTerm, countryFilter])

  return (
    <aside className="w-[350px] bg-black/20 border-r border-white/10 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-white/10 space-y-2 h-[100px] flex flex-col justify-center">
        <div className="flex items-center gap-3">
          <Newspaper className="w-8 h-8 gemini-text flex-shrink-0" />
          <div>
            <h1 className="text-xl font-bold tracking-tighter">Source IDE</h1>
            <p className="text-sm text-muted-foreground">
              {sources ? `${sources.length} sources` : 'Loading...'}
            </p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          onClick={onAddSource}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Source
        </Button>
        {isCheckingAll ? (
          <Button variant="destructive" className="w-full" onClick={onStopCheck}>
            <Ban className="mr-2 h-4 w-4" /> Stop Checking
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onCheckFiltered(filteredSources)}
          >
            <ShieldAlert className="mr-2 h-4 w-4" /> Check Filtered
          </Button>
        )}
        <div className="flex gap-2 justify-between">
          <Input
            placeholder="Search..."
            className="bg-background/50 placeholder:text-muted-foreground flex-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="bg-background/50 flex-1">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === 'all' ? 'All Countries' : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-grow min-h-0">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="text-center text-sm text-muted-foreground py-10 animate-pulse">
                Loading Sources...
              </div>
            ) : !sources ? (
              <div className="p-4 flex flex-col items-center justify-center h-full text-muted-foreground">
                <ServerCrash className="w-10 h-10 mb-4" />
                <h3 className="font-semibold">Failed to load sources</h3>
              </div>
            ) : filteredSources.length > 0 ? (
              filteredSources.map((source) => (
                <div key={source._id} className="flex items-center gap-1">
                  <Button
                    variant={selectedSourceId === source._id ? 'secondary' : 'ghost'}
                    className="w-full justify-start items-center gap-3 h-10 text-base"
                    onClick={() => onSelectSource(source._id)}
                  >
                    <div className="w-8 h-4 flex items-center justify-center">
                      <DynamicStatus source={source} status={liveStatuses[source._id]} />
                    </div>
                    <span className="flex-grow text-left truncate">{source.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {source.country}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 flex-shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(source.sectionUrl, '_blank')
                    }}
                    aria-label="Open source URL in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-muted-foreground py-10">
                <DatabaseZap className="mx-auto h-8 w-8 mb-2" />
                <p>No sources match filters.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  )
}
