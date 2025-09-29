// Full Path: headlines/src/app/(admin)/articles/columns.jsx
'use client'

import React from 'react'
import { Button, Badge, EditableCell, DataTableColumnHeader } from '@/components/shared' // CORRECTED IMPORT
import { Trash2, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

export const columns = (onUpdate, onDelete) => [
  {
    accessorKey: 'relevance_headline',
    header: ({ column }) => <DataTableColumnHeader column={column} title="HL Score" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.relevance_headline}</Badge>,
  },
  {
    accessorKey: 'relevance_article',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Article Score" />
    ),
    cell: ({ row }) => (
      <Badge variant={row.original.relevance_article > 50 ? 'default' : 'secondary'}>
        {row.original.relevance_article || 'N/A'}
      </Badge>
    ),
  },
  {
    accessorKey: 'headline',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Headline" />,
    cell: ({ row }) => (
      <EditableCell
        initialValue={row.original.headline}
        onSave={(newValue) => onUpdate(row.original, { headline: newValue })}
      />
    ),
  },
  {
    accessorKey: 'newspaper',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Source" />,
    cell: ({ row }) => (
      <EditableCell
        initialValue={row.original.newspaper}
        onSave={(newValue) => onUpdate(row.original, { newspaper: newValue })}
      />
    ),
  },
  {
    accessorKey: 'country',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Country" />,
    cell: ({ row }) => (
      <EditableCell
        initialValue={row.original.country}
        onSave={(newValue) => onUpdate(row.original, { country: newValue })}
      />
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Discovered" />,
    cell: ({ row }) => format(new Date(row.original.createdAt), 'dd MMM yyyy, HH:mm'),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <a href={row.original.link} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={() => onDelete(row.original._id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
]
