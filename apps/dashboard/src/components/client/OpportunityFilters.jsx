// src/components/OpportunityFilters.jsx (version 1.0)
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Card,
  CardContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui'

export function OpportunityFilters({ uniqueCountries }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentCountry = searchParams.get('country') || 'all'

  const handleCountryChange = (value) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('country')
    } else {
      params.set('country', value)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <Card className="mb-6 bg-slate-900/50 border-slate-700/80">
      <CardContent className="p-4">
        <div className="max-w-xs">
          <Label htmlFor="country-filter" className="text-slate-300">
            Filter by Country
          </Label>
          <Select value={currentCountry} onValueChange={handleCountryChange}>
            <SelectTrigger
              id="country-filter"
              className="w-full mt-1 bg-slate-900/80 border-slate-700"
            >
              <SelectValue placeholder="Filter by country..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {uniqueCountries.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
