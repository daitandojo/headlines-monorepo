'use client'
import { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Input,
} from '../shared'
import { Check, Globe, X, Search, Save } from 'lucide-react'
import { getCountryFlag, cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/client.js'

export function GlobalCountrySelector({ countries }) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { user, updateUserPreferences } = useAuth()
  const [selectedCountries, setSelectedCountries] = useState(
    user?.countries?.map((c) => c.name) || []
  )
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setSelectedCountries(user?.countries?.map((c) => c.name) || [])
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
    const newSubscriptions = selectedCountries.map((name) => ({ name, active: true }))
    await updateUserPreferences({ countries: newSubscriptions })
    setIsSaving(false)
    setOpen(false)
  }

  const renderIcon = () => {
    const userCountryNames = user?.countries?.map((c) => c.name) || []
    if (userCountryNames.length === 1) {
      return <span className="text-xl">{getCountryFlag(userCountryNames[0])}</span>
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
          <div className="p-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {/* ... rest of component ... */}
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
