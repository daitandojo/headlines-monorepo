// apps/client/src/app/admin/opportunities/columns.jsx
'use client'

import React from 'react'
import { Button, DataTableColumnHeader, Badge } from '@/components/shared'
import { Trash2, Edit, UserCheck } from 'lucide-react'
import { format } from 'date-fns'
import { EditableCell } from '@/components/shared/elements/EditableCell'

export const columns = (onEdit, onUpdate, onDelete) => [
  // NEW: Profile status column
  {
    id: 'profileStatus',
    header: 'Profile',
    cell: ({ row }) => {
      const hasProfile =
        row.original.profile && Object.keys(row.original.profile).length > 0
      return hasProfile ? <UserCheck className="h-4 w-4 text-green-400" /> : null
    },
    size: 50,
  },
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
    accessorKey: 'profile.estimatedNetWorthMM', // MODIFIED: Path to new total wealth field
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Net Worth ($M)" />
    ),
    cell: ({ row }) => (
      <EditableCell
        initialValue={row.original.profile?.estimatedNetWorthMM}
        onSave={(newValue) =>
          onUpdate(row.original, { 'profile.estimatedNetWorthMM': Number(newValue) })
        }
        placeholder="N/A"
      />
    ),
    size: 120,
  },
  {
    accessorKey: 'lastKnownEventLiquidityMM', // MODIFIED: Path to new event liquidity field
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Event Size ($M)" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.lastKnownEventLiquidityMM || 0}</Badge>
    ),
    size: 120,
  },
  {
    accessorKey: 'profile.wealthOrigin', // MODIFIED: Path to new field
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Wealth Origin" />
    ),
    cell: ({ row }) => (
      <EditableCell
        initialValue={row.original.profile?.wealthOrigin}
        onSave={(newValue) =>
          onUpdate(row.original, { 'profile.wealthOrigin': newValue })
        }
        placeholder="Add origin..."
      />
    ),
    size: 200,
  },
  {
    accessorKey: 'basedIn',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Country" />,
    cell: ({ row }) => (
      <EditableCell
        initialValue={
          Array.isArray(row.original.basedIn)
            ? row.original.basedIn.join(', ')
            : row.original.basedIn
        }
        onSave={(newValue) =>
          onUpdate(row.original, {
            basedIn: newValue
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
        placeholder="Add countries..."
      />
    ),
    size: 150,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(row.original._id)}
        >
          <Edit className="h-4 w-4" />
        </Button>
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
