// src/components/admin/sources/steps/Step1_InitialUrl.jsx (version 1.0)
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowRight } from 'lucide-react'

export function Step1_InitialUrl({ onNext, sourceConfig, updateConfig, allCountries }) {
  const isFormValid =
    sourceConfig.baseUrl.startsWith('http') &&
    sourceConfig.name.trim() !== '' &&
    sourceConfig.country.trim() !== ''

  const handleUrlChange = (e) => {
    const url = e.target.value
    updateConfig({ baseUrl: url })
    if (!sourceConfig.name && url.startsWith('http')) {
      try {
        const hostname = new URL(url).hostname
        // A simple heuristic to generate a name from the URL
        const name = hostname
          .replace(/^www\./, '')
          .split('.')
          .slice(0, -1)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ')
        updateConfig({ name })
      } catch (error) {
        // Invalid URL, do nothing
      }
    }
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto pt-8">
      <div className="space-y-2">
        <Label htmlFor="baseUrl" className="text-lg font-semibold">
          Source Base URL
        </Label>
        <p className="text-sm text-slate-400">
          Enter the main homepage URL of the news source (e.g., https://www.nytimes.com).
        </p>
        <Input
          id="baseUrl"
          value={sourceConfig.baseUrl}
          onChange={handleUrlChange}
          placeholder="https://example.com"
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name" className="text-lg font-semibold">
          Source Name
        </Label>
        <p className="text-sm text-slate-400">
          A unique, human-readable name for this source.
        </p>
        <Input
          id="name"
          value={sourceConfig.name}
          onChange={(e) => updateConfig({ name: e.target.value })}
          placeholder="e.g., The New York Times"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="country" className="text-lg font-semibold">
          Primary Country
        </Label>
        <p className="text-sm text-slate-400">
          The country this news source primarily covers.
        </p>
        <Select
          value={sourceConfig.country}
          onValueChange={(value) => updateConfig({ country: value })}
        >
          <SelectTrigger id="country">
            <SelectValue placeholder="Select a country..." />
          </SelectTrigger>
          <SelectContent>
            {allCountries.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} disabled={!isFormValid}>
          Next: Suggest News Sections
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
