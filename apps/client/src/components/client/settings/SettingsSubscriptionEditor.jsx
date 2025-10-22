// apps/client/src/components/client/settings/SectorSubscriptionEditor.jsx
'use client'

import { useState, useMemo } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
  Badge,
  Input,
} from '@/components/shared'
import { PlusCircle, X, Search, Briefcase } from 'lucide-react'

export function SectorSubscriptionEditor({
  allSectors,
  selectedSectors,
  onSelectionChange,
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const availableSectors = useMemo(() => {
    const filtered = allSectors.filter((s) => !selectedSectors.includes(s))
    if (!searchQuery) return filtered
    return filtered.filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [allSectors, selectedSectors, searchQuery])

  const handleAddSector = (sectorName) => {
    onSelectionChange([...selectedSectors, sectorName].sort())
    setSearchQuery('')
    setOpen(false)
  }

  const handleRemoveSector = (sectorName) => {
    onSelectionChange(selectedSectors.filter((s) => s !== sectorName))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[40px] bg-slate-900/50 border-slate-700">
        {selectedSectors.length > 0 ? (
          selectedSectors.map((sector) => (
            <Badge key={sector} variant="secondary" className="text-base py-1 px-3">
              <Briefcase className="h-3 w-3 mr-2" />
              <span>{sector}</span>
              <button
                onClick={() => handleRemoveSector(sector)}
                className="ml-2 rounded-full hover:bg-white/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <p className="text-sm text-slate-500">No sectors selected.</p>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Sector
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search sector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
            {availableSectors.length > 0 ? (
              availableSectors.map((sector) => (
                <Button
                  key={sector}
                  variant="ghost"
                  onClick={() => handleAddSector(sector)}
                  className="w-full justify-start"
                >
                  {sector}
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
