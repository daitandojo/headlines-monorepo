// src/app/countries/columns.jsx (version 1.2.0)
'use client'

import { Button } from '@components/shared'
import { Badge } from '@components/shared'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@components/shared'
import { ArrowUpDown, MoreHorizontal } from 'lucide-react'

export const columns = (handleEdit) => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Country Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status')
      const colorClass =
        status === 'active'
          ? 'bg-green-500/20 text-green-400 border-green-500/30'
          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      return <Badge className={colorClass}>{status}</Badge>
    },
  },
  {
    accessorKey: 'eventCount',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Total Events
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">{row.original.eventCount}</div>
    ),
  },
  {
    accessorKey: 'sourceCount',
    header: 'Sources',
    cell: ({ row }) => {
      const { sourceCount, activeSourceCount } = row.original
      let activeText
      if (activeSourceCount === 0 && sourceCount > 0) {
        activeText = '(none active)'
      } else if (activeSourceCount === sourceCount && sourceCount > 0) {
        activeText = '(all active)'
      } else {
        activeText = `(${activeSourceCount} active)`
      }
      return (
        <div className="text-center">
          <span className="font-medium">{sourceCount}</span>
          <span className="text-muted-foreground text-xs ml-1">{activeText}</span>
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const country = row.original
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleEdit(country._id)}>
                Edit Country
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]
