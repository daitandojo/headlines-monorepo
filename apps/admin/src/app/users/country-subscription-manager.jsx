// apps/admin/src/app/users/country-subscription-manager.jsx (version 1.0)
'use client'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@headlines/ui/src/index.js'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@headlines/ui/src/index.js'
import { Button } from '@headlines/ui/src/index.js'
import { Switch } from '@headlines/ui/src/index.js'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@headlines/utils/src/index.js'

export default function CountrySubscriptionManager({
  availableCountries,
  subscriptions,
  onChange,
}) {
  const [open, setOpen] = useState(false)

  const handleAddCountry = (countryName) => {
    if (!subscriptions.some((sub) => sub.name === countryName)) {
      const newSubscriptions = [...subscriptions, { name: countryName, active: true }]
      onChange(newSubscriptions.sort((a, b) => a.name.localeCompare(b.name)));
    }
    setOpen(false)
  }

  const handleRemoveCountry = (countryName) => {
    const newSubscriptions = subscriptions.filter((sub) => sub.name !== countryName)
    onChange(newSubscriptions)
  }

  const handleToggleActive = (countryName, isActive) => {
    const newSubscriptions = subscriptions.map((sub) =>
      sub.name === countryName ? { ...sub, active: isActive } : sub
    )
    onChange(newSubscriptions)
  }

  const subscribedCountryNames = new Set(subscriptions.map((s) => s.name))
  const addableCountries = availableCountries.filter(
    (c) => !subscribedCountryNames.has(c)
  ).sort()

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {subscriptions.length > 0 ? (
          subscriptions.map((sub) => (
            <div
              key={sub.name}
              className="flex items-center justify-between p-2 bg-black/20 rounded-md"
            >
              <span className="font-medium text-sm">{sub.name}</span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={sub.active}
                  onCheckedChange={(checked) => handleToggleActive(sub.name, checked)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRemoveCountry(sub.name)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-sm text-muted-foreground p-4 border border-dashed border-white/10 rounded-md">
            No countries subscribed.
          </div>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between">
            Add country subscription...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Search countries..." />
            <CommandList>
              <CommandEmpty>No countries found.</CommandEmpty>
              <CommandGroup>
                {addableCountries.map((country) => (
                  <CommandItem
                    key={country}
                    value={country}
                    onSelect={() => handleAddCountry(country)}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', 'opacity-0')} // Keep layout consistent
                    />
                    {country}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
