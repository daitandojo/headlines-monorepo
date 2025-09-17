// src/components/GlobalCountrySelector.jsx (version 5.1)
'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Globe, X, Search, Save } from 'lucide-react'
import { getCountryFlag } from '@/lib/countries'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

export function GlobalCountrySelector({ countries }) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { user, updateUserPreferences } = useAuth()
  const [selectedCountries, setSelectedCountries] = useState(user?.countries || [])
  const [isSaving, setIsSaving] = useState(false)

  // Sync local state if the user context changes (e.g., after initial load)
  useEffect(() => {
    setSelectedCountries(user?.countries || [])
  }, [user?.countries])

  const filteredCountries = useMemo(() => {
    if (!searchQuery) return countries
    return countries.filter((country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [countries, searchQuery])

  const handleSelect = (countryName) => {
    const newSelection = selectedCountries.includes(countryName)
      ? selectedCountries.filter((c) => c !== countryName)
      : [...selectedCountries, countryName]
    setSelectedCountries(newSelection)
  }

  const handleSave = async () => {
    setIsSaving(true)
    await updateUserPreferences({ countries: selectedCountries })
    setIsSaving(false)
    setOpen(false)
  }

  const renderIcon = () => {
    if (user?.countries?.length === 1) {
      return <span className="text-xl">{getCountryFlag(user.countries[0])}</span>
    }
    return <Globe className="h-5 w-5" />
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Select Country Filter">
          {renderIcon()}
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 max-w-2xl">
        <div className="flex flex-col h-full">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Filter by Region</DialogTitle>
            <DialogDescription>
              Select from your subscribed countries to apply a global filter.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-11 w-full"
            />
          </div>
          <div className="p-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {filteredCountries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {filteredCountries.map((country) => {
                  const isSubscribed = user?.countries?.includes(country.name)
                  return (
                    <Button
                      key={country.name}
                      variant="ghost"
                      onClick={() => isSubscribed && handleSelect(country.name)}
                      disabled={!isSubscribed}
                      className="flex items-center justify-start h-auto p-2 data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedCountries.includes(country.name)
                            ? 'opacity-100 text-blue-400'
                            : 'opacity-0'
                        )}
                      />
                      <span className="mr-2">{getCountryFlag(country.name)}</span>
                      <span className="mr-2">{country.name}</span>
                      <span className="text-xs text-slate-500">({country.count})</span>
                    </Button>
                  )
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">No country found.</p>
            )}
          </div>
          <div className="p-4 border-t flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save and Close'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
