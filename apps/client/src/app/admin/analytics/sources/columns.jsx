// apps/client/src/app/admin/analytics/sources/columns.jsx
'use client'

import { DataTableColumnHeader } from '@/components/shared'
import { cn } from '@headlines/utils-shared'
import { formatDistanceToNow } from 'date-fns'

const formatPercent = (value) => {
  if (typeof value !== 'number') return 'N/A'
  return `${(value * 100).toFixed(2)}%`
}

export const columns = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Source Name" />,
    cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
  },
  {
    accessorKey: 'country',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Country" />,
  },
  {
    accessorKey: 'successRate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Success Rate" />
    ),
    cell: ({ row }) => {
      const rate = row.original.successRate
      const color =
        rate > 0.9 ? 'text-green-400' : rate > 0.7 ? 'text-yellow-400' : 'text-red-400'
      return <div className={cn('font-semibold', color)}>{formatPercent(rate)}</div>
    },
  },
  {
    accessorKey: 'leadRate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Lead Rate" />,
    cell: ({ row }) => {
      const rate = row.original.leadRate
      const color =
        rate > 0.05
          ? 'text-green-400'
          : rate > 0.01
            ? 'text-yellow-400'
            : 'text-slate-400'
      return <div className={cn('font-semibold', color)}>{formatPercent(rate)}</div>
    },
  },
  {
    accessorKey: 'analytics.totalScraped',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total Scraped" />
    ),
    cell: ({ row }) => (row.original.analytics?.totalScraped || 0).toLocaleString(),
  },
  {
    accessorKey: 'analytics.totalRelevant',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total Relevant" />
    ),
    cell: ({ row }) => (row.original.analytics?.totalRelevant || 0).toLocaleString(),
  },
  {
    accessorKey: 'lastScrapedAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Scraped" />
    ),
    cell: ({ row }) => {
      const date = row.original.lastScrapedAt
      return date ? `${formatDistanceToNow(new Date(date))} ago` : 'Never'
    },
  },
]
