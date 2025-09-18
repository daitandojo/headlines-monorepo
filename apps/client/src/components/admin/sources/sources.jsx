// apps/client/src/components/admin/sources/columns.jsx (Restored & Pathed)
'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@headlines/ui'
import { Button, Badge } from '@headlines/ui'
import { MoreHorizontal, Trash2, Globe } from 'lucide-react'
import { getCountryFlag } from '@headlines/utils'

export const columns = ({ removeSource }) => [
  {
    accessorKey: 'name',
    header: 'Source Name',
    cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
  },
  {
    accessorKey: 'country',
    header: 'Country',
    cell: ({ row }) => {
      const country = row.getValue('country')
      return (
        <div className="flex items-center gap-2">
          <span>{getCountryFlag(country)}</span>
          <span>{country}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status')
      const variant =
        status === 'active'
          ? 'outline'
          : status === 'paused'
            ? 'secondary'
            : 'destructive'
      const colorClass = status === 'active' ? 'border-green-500/50 text-green-400' : ''
      return (
        <Badge variant={variant} className={colorClass}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'extractionMethod',
    header: 'Method',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue('extractionMethod')}</span>
    ),
  },
  {
    accessorKey: 'lastSuccessAt',
    header: 'Last Success',
    cell: ({ row }) => {
      const date = row.getValue('lastSuccessAt')
      return date ? new Date(date).toLocaleString() : 'N/A'
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const source = row.original
      const handleDelete = () => {
        if (confirm(`Are you sure you want to delete the source: ${source.name}?`)) {
          removeSource(source._id)
        }
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.open(source.sectionUrl, '_blank')}>
              <Globe className="mr-2 h-4 w-4" />
              Visit Source
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-red-400 focus:bg-red-500/20 focus:text-red-400"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Source
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
