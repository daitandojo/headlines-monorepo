// src/components/ViewHeader.jsx (version 2.1)
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Search, Clock, BarChart, ArrowDownUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap = {
  clock: Clock,
  relevance: BarChart,
  size: ArrowDownUp,
}

export function ViewHeader({ title, baseSubtitle, count, isCountLoading, sortOptions }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSort = searchParams.get('sort') || 'date_desc'
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearchTerm) {
      params.set('q', debouncedSearchTerm)
    } else {
      params.delete('q')
    }
    // Use replace to avoid polluting browser history on every keystroke.
    // The dependency array is changed to only run when the debounced term changes, fixing the loop.
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [debouncedSearchTerm, router]) // <-- REMOVED searchParams from dependencies

  const handleSortChange = (newSort) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newSort === 'date_desc') {
      params.delete('sort')
    } else {
      params.set('sort', newSort)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const subtitleText = isCountLoading
    ? 'Calculating...'
    : `${count?.toLocaleString() ?? '...'} ${baseSubtitle}`

  return (
    <div className="flex flex-col items-center justify-center text-center mb-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-100">{title}</h2>
        {/* <p className="text-slate-400 mt-1 transition-colors">{subtitleText}</p> */}
      </div>

      <div className="w-full flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <Input
            id="search"
            placeholder="Search by name, company, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900/80 border-slate-700 h-12 pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            {sortOptions.map((option) => {
              const IconComponent = iconMap[option.icon] || Clock
              return (
                <Tooltip key={option.value}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSortChange(option.value)}
                      className={cn(
                        'h-12 w-12',
                        currentSort === option.value && 'bg-blue-500/20 text-blue-300'
                      )}
                      aria-label={option.tooltip}
                    >
                      <IconComponent className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{option.tooltip}</TooltipContent>
                </Tooltip>
              )
            })}
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}
