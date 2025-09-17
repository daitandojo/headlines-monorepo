// apps/admin/src/app/sources/suggestion-columns.jsx (version 1.0)
'use client'

import { Button } from '@headlines/ui'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@headlines/ui'
import { ArrowUpDown, Check, X, Code } from 'lucide-react'

export const suggestionColumns = (onAction) => [
  {
    accessorKey: 'sourceName',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Source Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'reasoning',
    header: 'AI Reasoning',
    cell: ({ row }) => (
      <div className="truncate max-w-md text-muted-foreground">
        {row.getValue('reasoning')}
      </div>
    ),
  },
  {
    id: 'suggestedSelectors',
    header: 'Suggested Fix',
    cell: ({ row }) => {
      const selectors = row.original.suggestedSelectors
      return (
        <div className="font-mono text-xs flex flex-col gap-1">
          {Object.entries(selectors).map(([key, value]) =>
            value ? (
              <div key={key}>
                <span className="text-muted-foreground">{key}: </span>
                <span>{value}</span>
              </div>
            ) : null
          )}
        </div>
      )
    },
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
                <p>Approve and apply fix</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => onAction(suggestion, 'rejected')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reject this suggestion</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    },
  },
]
