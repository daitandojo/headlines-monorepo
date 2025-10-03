'use client'

import React from 'react'
import {
  Button,
  DataTableColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/shared'
import { Trash2, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { EditableCell } from '@/components/shared/elements/EditableCell'
import Link from 'next/link'

export const columns = (onUpdate, onDelete) => [
  {
    accessorKey: 'reachOutTo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contact Name" />
    ),
    cell: ({ row }) => (
      <EditableCell
        initialValue={row.original.reachOutTo}
        onSave={(newValue) => onUpdate(row.original, { reachOutTo: newValue })}
      />
    ),
    minSize: 200,
  },
  {
    accessorKey: 'contactDetails.company',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Company" />,
    cell: ({ row }) => (
      <EditableCell
        initialValue={row.original.contactDetails?.company}
        onSave={(newValue) =>
          onUpdate(row.original, { 'contactDetails.company': newValue })
        }
        placeholder="N/A"
      />
    ),
    size: 200,
  },
  {
    accessorKey: 'contactDetails.email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => (
      <EditableCell
        initialValue={row.original.contactDetails?.email}
        onSave={(newValue) =>
          onUpdate(row.original, { 'contactDetails.email': newValue })
        }
        placeholder="N/A"
      />
    ),
    size: 250,
  },
  {
    accessorKey: 'likelyMMDollarWealth',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Wealth ($M)" />,
    cell: ({ row }) => (
      <EditableCell
        initialValue={row.original.likelyMMDollarWealth}
        onSave={(newValue) =>
          onUpdate(row.original, { likelyMMDollarWealth: Number(newValue) })
        }
      />
    ),
    size: 120,
  },
  {
    accessorKey: 'basedIn',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Country" />,
    cell: ({ row }) => (
      <EditableCell
        initialValue={row.original.basedIn}
        onSave={(newValue) => onUpdate(row.original, { basedIn: newValue })}
      />
    ),
    size: 150,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => format(new Date(row.original.createdAt), 'dd MMM yyyy, HH:mm'),
    size: 180,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-red-500"
          onClick={() => onDelete(row.original._id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
    size: 80,
    enableResizing: false,
  },
]
