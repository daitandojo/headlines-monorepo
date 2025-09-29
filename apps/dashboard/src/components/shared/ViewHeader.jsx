// packages/ui/src/ViewHeader.jsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
// DEFINITIVE FIX: Import hooks from the dedicated '/hooks' entry point.
import { useDebounce } from '@/hooks'
import {
  Input,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ScrollArea,
} from '../shared'
import { Search, Clock, BarChart, ArrowDownUp, Mail, Star, X } from 'lucide-react'
import { cn } from '@headlines/utils-shared'

const iconMap = { clock: Clock, relevance: BarChart, size: ArrowDownUp }

export function ViewHeader({
  title,
  sortOptions,
  allCountries = [],
  globalCountryFilter = [],
  viewCountry,
  onViewCountryChange,
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSort = searchParams.get('sort') || 'date_desc'
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearchTerm) params.set('q', debouncedSearchTerm)
    else params.delete('q')
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [debouncedSearchTerm, router, searchParams])

  const handleUrlParamChange = (key, value) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === 'all' || value === false) params.delete(key)
    else params.set(key, value)
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleClearSearch = () => setSearchTerm('')

  const withEmailOnly = searchParams.get('withEmail') === 'true'
  const favoritesOnly = searchParams.get('favorites') === 'true'

  const displayedCountries = useMemo(() => {
    if (globalCountryFilter.length > 0) {
      const globalFilterSet = new Set(globalCountryFilter)
      return allCountries.filter((c) => globalFilterSet.has(c.name))
    }
    return allCountries
  }, [allCountries, globalCountryFilter])

  return (
    <div className="flex flex-col items-center justify-center text-center mb-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-100">{title}</h2>
      </div>
      <div className="w-full flex flex-col sm:flex-row items-center gap-4">
        <div className="flex w-full sm:w-auto items-center gap-2">
          <Select value={viewCountry} onValueChange={onViewCountryChange}>
            <SelectTrigger className="w-full sm:w-[200px] h-12 bg-slate-900/80 border-slate-700">
              <SelectValue placeholder="View Country..." />
            </SelectTrigger>
            <SelectContent>
              <ScrollArea className="h-[250px]">
                <SelectItem value="all">All Selected Countries</SelectItem>
                {displayedCountries.map((country) => (
                  <SelectItem key={country.name} value={country.name}>
                    {country.name} ({country.count})
                  </SelectItem>
                ))}
              </ScrollArea>
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <Input
            id="search"
            placeholder="Search by name, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900/80 border-slate-700 h-12 pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
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
                      onClick={() =>
                        handleUrlParamChange(
                          'sort',
                          option.value === 'date_desc' ? null : option.value
                        )
                      }
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
