// src/components/CountrySubscriptionEditor.jsx (version 1.1)
'use client'

import { useState, useMemo } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
  Badge,
  Input,
} from '@shared/ui'
import { PlusCircle, X, Search } from 'lucide-react'
import { getCountryFlag } from '@shared/utils-shared'

export function CountrySubscriptionEditor({
  allCountries,
  selectedCountries,
  onSelectionChange,
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const availableCountries = useMemo(() => {
    const filtered = allCountries.filter((c) => !selectedCountries.includes(c.name))
    if (!searchQuery) return filtered
    return filtered.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [allCountries, selectedCountries, searchQuery])

  const handleAddCountry = (countryName) => {
    onSelectionChange([...selectedCountries, countryName].sort())
    setSearchQuery('')
    setOpen(false)
  }

  const handleRemoveCountry = (countryName) => {
    onSelectionChange(selectedCountries.filter((c) => c !== countryName))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[40px] bg-slate-900/50">
        {selectedCountries.length > 0 ? (
          selectedCountries.map((country) => (
            <Badge key={country} variant="secondary" className="text-base py-1 px-3">
              <span>{getCountryFlag(country)}</span>
              <span>{country}</span>
              <button
                onClick={() => handleRemoveCountry(country)}
                className="ml-2 rounded-full hover:bg-white/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <p className="text-sm text-slate-500">No countries selected.</p>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Country
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
            {availableCountries.length > 0 ? (
              availableCountries.map((country) => (
                <Button
                  key={country.name}
                  variant="ghost"
                  onClick={() => handleAddCountry(country.name)}
                  className="w-full justify-start flex items-center gap-2"
                >
                  <span>{getCountryFlag(country.name)}</span>
                  <span>{country.name}</span>
                  <span className="text-xs text-slate-500 ml-auto">
                    ({country.count})
                  </span>
                </Button>
              ))
            ) : (
              <p className="text-center text-sm text-slate-500 py-4">No results found.</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
