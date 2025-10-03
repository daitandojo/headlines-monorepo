'use client'

import React from 'react'
import {
  Button,
  Badge,
  DataTableColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/shared'
import { MoreHorizontal, Building, User, Users, Trash2, Check, X } from 'lucide-react'
import { EditableCell } from '@/components/shared/elements/EditableCell'

const TypeIcon = ({ type }) => {
  if (type === 'person') return <User className="h-5 w-5 text-blue-400" />
  if (type === 'family') return <Users className="h-5 w-5 text-purple-400" />
  return <Building className="h-5 w-5 text-orange-400" />
}

export const watchlistColumns = (handleEdit, onUpdate, onDelete) => [
  {
    accessorKey: 'hitCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Hits" />,
    cell: ({ row }) => (
      <div className="text-center font-medium">{row.original.hitCount || 0}</div>
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <TypeIcon type={row.original.type} />
        <span className="font-medium">{row.getValue('name')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'searchTerms',
    header: 'Search Terms',
    cell: ({ row }) => (
      <div className="max-w-md">
        <EditableCell
          initialValue={(row.original.searchTerms || []).join(', ')}
          onSave={(newValue) =>
            onUpdate(row.original, {
              searchTerms: newValue.split(',').map((s) => s.trim()),
            })
          }
          placeholder="Add terms..."
          useTextarea={true}
        />
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const entity = row.original
      const colorClass = {
        active: 'bg-green-500/20 text-green-400 border-green-500/30',
        inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        candidate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      }[entity.status]
      return <Badge className={colorClass}>{entity.status}</Badge>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleEdit(row.original._id)}>
              Edit Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
              onClick={() => onDelete(row.original._id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
]

export const suggestionColumns = (onAction, onUpdate) => [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <TypeIcon type={row.original.type} />
        <span className="font-medium">{row.getValue('name')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'rationale',
    header: 'AI Rationale',
    cell: ({ row }) => (
      <div className="truncate max-w-sm">{row.getValue('rationale')}</div>
    ),
  },
  {
    accessorKey: 'sourceEvent',
    header: 'Source Event',
    cell: ({ row }) => (
      <div className="truncate max-w-xs text-muted-foreground">
        {row.getValue('sourceEvent')}
      </div>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const suggestion = row.original
      return (
        <div className="text-right space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-400 hover:bg-green-500/10 hover:text-green-400"
                  onClick={() => onAction(suggestion, 'approved')}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Approve and add to watchlist</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => onAction(suggestion, 'dismissed')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Dismiss this suggestion</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    },
  },
]
