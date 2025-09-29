// File: apps/client/src/components/client/GlobalCountrySelector.jsx (Corrected and Unabridged)

'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Input,
  Checkbox,
  ScrollArea,
} from '@/components/shared'
import { Globe, Save, Search } from 'lucide-react'
import { getCountryFlag } from '@headlines/utils-shared/next'
import { useAuth } from '@/lib/auth/client.js'
import { toast } from 'sonner'

export function GlobalCountrySelector({ allCountries }) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { user, updateUserPreferences } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [selectedInDialog, setSelectedInDialog] = useState([])
  const router = useRouter()

  useEffect(() => {
    if (open && user) {
      if (user.role === 'admin') {
        setSelectedInDialog(allCountries.map((c) => c.name))
      } else {
        setSelectedInDialog((user.countries || []).map((c) => c.name))
      }
    }
  }, [open, user, allCountries])

  const filteredCountries = useMemo(() => {
    if (!allCountries) return []
    if (!searchQuery) return allCountries
    return allCountries.filter((country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [allCountries, searchQuery])

  const handleSelect = (countryName) => {
    const newSelection = selectedInDialog.includes(countryName)
      ? selectedInDialog.filter((c) => c !== countryName)
      : [...selectedInDialog, countryName]
    setSelectedInDialog(newSelection.sort())
  }

  const handleSave = async () => {
    setIsSaving(true)
    const newSubscriptions = selectedInDialog.map((name) => ({ name, active: true }))
    await updateUserPreferences({ countries: newSubscriptions })
    toast.success('Country subscriptions updated.')

    router.refresh()

    setIsSaving(false)
    setOpen(false)
  }

  const renderIcon = () => {
    if (!user) return <Globe className="h-5 w-5" />
    const userCountryNames = user.countries || []
    if (userCountryNames.length === 1) {
      return <span className="text-xl">{getCountryFlag(userCountryNames[0].name)}</span>
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
          <ScrollArea className="max-h-[50vh]">
            <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
              {filteredCountries.map((country) => (
                <Button
                  key={country.name}
                  variant="ghost"
                  onClick={() => handleSelect(country.name)}
                  className="w-full justify-start flex items-center gap-2"
                >
                  <Checkbox
                    checked={selectedInDialog.includes(country.name)}
                    className="mr-2"
                  />
                  <span>{getCountryFlag(country.name)}</span>
                  <span>{country.name}</span>
                  <span className="text-xs text-slate-500 ml-auto">
                    ({country.count})
                  </span>
                </Button>
              ))}
            </div>
          </ScrollArea>
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
