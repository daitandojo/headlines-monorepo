// apps/admin/src/app/opportunities/columns.jsx (version 2.5.0 - Responsive Layout)
'use client'

import React from 'react'
import { Button, EditableCell } from '@components/shared'
import { ArrowUpDown, Trash2, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

// Compact Cell Wrapper
const CompactCell = ({ children, allowWrap = false }) => (
  <div className={`text-xs p-1 ${allowWrap ? 'whitespace-normal' : ''}`}>{children}</div>
)
const CompactHeader = ({ column, title }) => (
  <Button
    variant="ghost"
    className="h-8 -ml-4"
    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
  >
    <span className="text-xs">{title}</span>
    <ArrowUpDown className="ml-2 h-3 w-3" />
  </Button>
)

export const columns = (onUpdate, onDelete, onEdit) => [
  {
    accessorKey: '_id',
    header: 'ID',
    cell: ({ row }) => (
      <CompactCell>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 font-mono text-[11px] w-full justify-start max-w-[90px]"
          onClick={() => {
            navigator.clipboard.writeText(row.original._id)
            toast.success('ID Copied!')
          }}
        >
          <span className="truncate">{row.original._id}</span>
        </Button>
      </CompactCell>
    ),
    size: 90,
    minSize: 90,
    maxSize: 90,
    meta: { className: 'w-[90px]' },
  },
  {
    accessorKey: 'basedIn',
    header: ({ column }) => <CompactHeader column={column} title="Country" />,
    cell: ({ row }) => (
      <CompactCell>
        <div className="max-w-[85px]">
          <EditableCell
            initialValue={row.original.basedIn}
            placeholder="Add..."
            onSave={(newValue) => onUpdate(row.original, { basedIn: newValue })}
          />
        </div>
      </CompactCell>
    ),
    size: 85,
    minSize: 85,
    maxSize: 85,
    meta: { className: 'w-[85px]' },
  },
  {
    accessorKey: 'city',
    header: ({ column }) => <CompactHeader column={column} title="City" />,
    cell: ({ row }) => (
      <CompactCell>
        <div className="max-w-[75px]">
          <EditableCell
            initialValue={row.original.city}
            placeholder="Add..."
            onSave={(newValue) => onUpdate(row.original, { city: newValue })}
          />
        </div>
      </CompactCell>
    ),
    size: 75,
    minSize: 75,
    maxSize: 75,
    meta: { className: 'w-[75px]' },
  },
  {
    accessorKey: 'reachOutTo',
    header: ({ column }) => <CompactHeader column={column} title="Contact" />,
    cell: ({ row }) => (
      <CompactCell>
        <div className="max-w-[110px]">
          <EditableCell
            initialValue={row.original.reachOutTo}
            onSave={(newValue) => onUpdate(row.original, { reachOutTo: newValue })}
          />
        </div>
      </CompactCell>
    ),
    size: 110,
    minSize: 110,
    maxSize: 110,
    meta: { className: 'w-[110px]' },
  },
  {
    accessorKey: 'likelyMMDollarWealth',
    header: ({ column }) => <CompactHeader column={column} title="Wealth ($M)" />,
    cell: ({ row }) => (
      <CompactCell>
        <div className="max-w-[80px]">
          <EditableCell
            initialValue={row.original.likelyMMDollarWealth}
            placeholder="Add..."
            onSave={(newValue) =>
              onUpdate(row.original, { likelyMMDollarWealth: newValue })
            }
            type="number"
          />
        </div>
      </CompactCell>
    ),
    size: 80,
    minSize: 80,
    maxSize: 80,
    meta: { className: 'w-[80px]' },
  },
  {
    accessorKey: 'contactDetails.email',
    header: ({ column }) => <CompactHeader column={column} title="Email" />,
    cell: ({ row }) => (
      <CompactCell>
        <div className="max-w-[160px]">
          <EditableCell
            initialValue={row.original.contactDetails?.email}
            placeholder="Add..."
            onSave={(newValue) =>
              onUpdate(row.original, { 'contactDetails.email': newValue })
            }
          />
        </div>
      </CompactCell>
    ),
    size: 160,
    minSize: 160,
    maxSize: 160,
    meta: { className: 'w-[160px]' },
  },
  {
    accessorKey: 'whyContact',
    header: 'Reason',
    cell: ({ row }) => (
      <CompactCell allowWrap={true}>
        <EditableCell
          initialValue={row.original.whyContact}
          onSave={(newValue) => onUpdate(row.original, { whyContact: newValue })}
          placeholder="Add reason..."
          useTextarea={true}
          allowWrap={true}
        />
      </CompactCell>
    ),
    // This column will flex to fill remaining space
    minSize: 120,
    meta: { className: 'flex-1 min-w-[120px]' },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <CompactHeader column={column} title="Created" />,
    cell: ({ row }) => (
      <CompactCell>
        <div className="max-w-[70px]">
          {format(new Date(row.original.createdAt), 'dd MMM yy')}
        </div>
      </CompactCell>
    ),
    size: 70,
    minSize: 70,
    maxSize: 70,
    meta: { className: 'w-[70px]' },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center justify-end opacity-50 group-hover:opacity-100 max-w-[60px]">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onEdit(row.original._id)}
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onDelete(row.original)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    ),
    size: 60,
    minSize: 60,
    maxSize: 60,
    enableResizing: false,
    meta: { className: 'w-[60px]' },
  },
]
