// apps/admin/src/app/sources/columns.jsx (version 1.9.2)
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@headlines/ui'
import { Badge } from '@headlines/ui'
import { Input } from '@headlines/ui'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@headlines/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@headlines/ui'
import {
  ArrowUpDown,
  MoreHorizontal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Edit,
} from 'lucide-react'

const HealthIndicator = ({ source }) => {
  const analytics = source.analytics || { totalRuns: 0, lastRunHeadlineCount: 0 };
  let icon, tooltipText;

  if (analytics.totalRuns === 0) {
    icon = <Clock className="h-5 w-5 text-muted-foreground" />;
    tooltipText = 'New source, has not been scraped yet.';
  } else if (analytics.lastRunHeadlineCount === 0) {
    icon = <XCircle className="h-5 w-5 text-red-500" />;
    tooltipText = 'Scrape Failure: The last run found 0 headlines.';
  } else {
    icon = <CheckCircle2 className="h-5 w-5 text-green-500" />;
    tooltipText = 'Healthy: Scrapes are successful.';
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{icon}</div>
        </TooltipTrigger>
        <TooltipContent><p>{tooltipText}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const EditableSourceName = ({ source, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(source.name);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (name.trim() && name.trim() !== source.name) {
            onUpdate(source, { name: name.trim() });
        }
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <Input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') setIsEditing(false);
                }}
                className="h-8"
            />
        );
    }
    
    return (
        <Button variant="ghost" className="h-auto p-1 font-medium text-left justify-start" onClick={() => setIsEditing(true)}>
            <Edit className="h-3 w-3 mr-2 text-muted-foreground opacity-50 group-hover:opacity-100" />
            {source.name}
        </Button>
    )
}

export const columns = (handleEdit, handleTest, handleStatusToggle, onUpdate) => [
  {
    accessorKey: 'health',
    header: () => <div className="text-center">Health</div>,
    cell: ({ row }) => <div className="flex justify-center"><HealthIndicator source={row.original} /></div>,
    filterFn: (row, id, value) => {
      if (value === 'failing') {
        return row.original.analytics?.totalRuns > 0 && row.original.analytics?.lastRunHeadlineCount === 0;
      }
      return true;
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Name <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="group"><EditableSourceName source={row.original} onUpdate={onUpdate} /></div>
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const source = row.original, status = source.status;
      const colorClass = { active: 'bg-green-500/20 text-green-400', paused: 'bg-yellow-500/20 text-yellow-400', under_review: 'bg-gray-500/20 text-gray-400'}[status];
      return <Badge variant="outline" className={`cursor-pointer transition-colors ${colorClass}`} onClick={() => handleStatusToggle(source)}>{status}</Badge>
    },
  },
  {
    accessorKey: 'country',
    header: 'Country',
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: 'totalRelevant', // Use a flat ID for sorting
    accessorFn: row => row.analytics?.totalRelevant || 0, // Tell the table how to get the value
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Relevant <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-center">{row.original.analytics?.totalRelevant || '—'}</div>,
  },
  {
    accessorKey: 'relevanceRate',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Relevance % <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const { totalScraped = 0, totalRelevant = 0 } = row.original.analytics || {};
      if (totalScraped === 0) return <div className="text-center text-muted-foreground">N/A</div>;
      const rate = (totalRelevant / totalScraped) * 100;
      return <div className="text-center font-medium">{rate.toFixed(1)}%</div>
    },
  },
  {
    id: 'totalScraped', // Use a flat ID for sorting
    accessorFn: row => row.analytics?.totalScraped || 0, // Tell the table how to get the value
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Scraped <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-center">{row.original.analytics?.totalScraped || '—'}</div>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const source = row.original;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleEdit(source._id)}>Edit Source</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTest(source)}>Run Test Scrape</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]
