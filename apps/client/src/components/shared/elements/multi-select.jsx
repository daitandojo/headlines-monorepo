// File: apps/client/src/components/admin/multi-select.jsx (version 1.0 - New File)
'use client'

import * as React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
  Checkbox,
  ScrollArea,
} from './index.js'
import { ChevronsUpDown } from 'lucide-react'

export function MultiSelect({ options, selected, onChange, placeholder = 'Select...' }) {
  const handleSelect = (option) => {
    const newSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]
    onChange(newSelected)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between font-normal bg-black/20 border-white/10"
        >
          <span className="truncate">
            {selected.length > 0 ? selected.join(', ') : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] p-0">
        <ScrollArea className="h-72">
          <div className="p-1">
            {options.map((option) => (
              <DropdownMenuItem
                key={option}
                onSelect={(e) => e.preventDefault()}
                className="flex items-center gap-2"
              >
                <Checkbox
                  id={`select-${option}`}
                  checked={selected.includes(option)}
                  onCheckedChange={() => handleSelect(option)}
                />
                <label htmlFor={`select-${option}`} className="w-full">
                  {option}
                </label>
              </DropdownMenuItem>
            ))}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
