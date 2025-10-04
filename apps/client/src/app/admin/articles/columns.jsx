// apps/client/src/app/admin/articles/columns.jsx (Multi-country support)
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
} from '@/components/shared'
import { Trash2, ExternalLink, MoreHorizontal, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { EditableCell } from '@/components/shared/elements/EditableCell'
import Link from 'next/link'

export const columns = (onUpdate, onDelete) => [
  {
    accessorKey: 'relevance_headline',
    header: ({ column }) => <DataTableColumnHeader column={column} title="HL Score" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.relevance_headline}</Badge>,
    size: 100,
  },
  {
    accessorKey: 'relevance_article',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Article Score" />
    ),
    cell: ({ row }) => (
      <EditableCell
        initialValue={row.original.relevance_article}
        onSave={(newValue) =>
          onUpdate(row.original, { relevance_article: Number(newValue) })
        }
        placeholder="N/A"
      />
    ),
    size: 120,
  },
  {
    accessorKey: 'headline',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Headline" />,
    cell: ({ row }) => (
      <div className="max-w-[400px] xl:max-w-[600px]">
        <EditableCell
          initialValue={row.original.headline}
          onSave={(newValue) => onUpdate(row.original, { headline: newValue })}
          useTextarea={true}
        />
      </div>
    ),
    minSize: 400,
  },
  {
    accessorKey: 'newspaper',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Source" />,
    cell: ({ row }) => (
      <div className="max-w-[180px]">
        <EditableCell
          initialValue={row.original.newspaper}
          onSave={(newValue) => onUpdate(row.original, { newspaper: newValue })}
        />
      </div>
    ),
    size: 180,
  },
  {
    accessorKey: 'country',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Country" />,
    cell: ({ row }) => (
      <div className="max-w-[150px]">
        {/* MODIFIED: EditableCell now handles arrays via join/split */}
        <EditableCell
          initialValue={(row.original.country || []).join(', ')}
          onSave={(newValue) =>
            onUpdate(row.original, {
              country: newValue
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="Add countries..."
        />
      </div>
    ),
    size: 150,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Discovered" />,
    cell: ({ row }) => format(new Date(row.original.createdAt), 'dd MMM yyyy, HH:mm'),
    size: 180,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
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
            <DropdownMenuItem asChild>
              <Link href={`/admin/articles/${row.original._id}`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={row.original.link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Original
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
              onClick={() => onDelete(row.original._id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Article
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    size: 80,
    enableResizing: false,
  },
]
