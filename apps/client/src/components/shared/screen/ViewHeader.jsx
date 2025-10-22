// apps/client/src/components/shared/screen/ViewHeader.jsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks'
import {
  Input,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '../elements'
import {
  Search,
  Clock,
  BarChart,
  ArrowDownUp,
  Filter,
  Star, // NEW ICON
  X,
} from 'lucide-react'
import { cn } from '@headlines/utils-shared'

const iconMap = { clock: Clock, relevance: BarChart, size: ArrowDownUp }

const filterOptions = [
  { value: 'M&A', label: 'M&A', group: 'Transaction' },
  { value: 'IPO', label: 'IPO', group: 'Transaction' },
  { value: 'Divestment', label: 'Divestment', group: 'Transaction' },
  { value: 'Leadership Succession', label: 'Succession', group: 'Transaction' },
  { value: 'New Wealth', label: 'New Wealth', group: 'Classification' },
  { value: 'Wealth Profile', label: 'Wealth Profile', group: 'Classification' },
  { value: 'Future Wealth', label: 'Future Wealth', group: 'Classification' },
]

export function ViewHeader({ title, sortOptions }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSort = searchParams.get('sort') || 'date_desc'
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const activeCategories = searchParams.get('category')?.split(',') || []
  const favoritesOnly = searchParams.get('favorites') === 'true' // NEW: Read favorites status

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearchTerm) params.set('q', debouncedSearchTerm)
    else params.delete('q')
    // Reset to page 1 on new search
    if (params.has('q') || debouncedSearchTerm) {
      params.set('page', '1')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [debouncedSearchTerm, router, pathname, searchParams])

  const handleUrlParamChange = (key, value) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === 'all' || value === false) params.delete(key)
    else params.set(key, value)
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleCategoryChange = (categoryValue) => {
    const newCategories = activeCategories.includes(categoryValue)
      ? activeCategories.filter((c) => c !== categoryValue)
      : [...activeCategories, categoryValue]

    handleUrlParamChange('category', newCategories.join(','))
  }

  const handleClearSearch = () => setSearchTerm('')

  return (
    <div className="flex flex-col items-center justify-center text-center mb-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-100">{title}</h2>
      </div>
      <div className="w-full flex flex-col sm:flex-row items-center gap-4">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'h-12 w-12',
                  activeCategories.length > 0 && 'bg-blue-500/20 text-blue-300'
                )}
                aria-label="Filter events"
              >
                <Filter className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {filterOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={activeCategories.includes(option.value)}
                  onCheckedChange={() => handleCategoryChange(option.value)}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
              {activeCategories.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    onSelect={() => handleUrlParamChange('category', null)}
                  >
                    Clear Filters
                  </DropdownMenuCheckboxItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* NEW: Favorites Filter Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleUrlParamChange('favorites', !favoritesOnly)}
                  className={cn(
                    'h-12 w-12',
                    favoritesOnly && 'bg-yellow-500/20 text-yellow-300'
                  )}
                  aria-label="Show Favorites"
                >
                  <Star className={cn('h-5 w-5', favoritesOnly && 'fill-current')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show Favorites Only</p>
              </TooltipContent>
            </Tooltip>
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
