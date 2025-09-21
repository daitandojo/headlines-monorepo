// apps/admin/src/app/watchlist/columns.jsx (version 3.5.0 - Final Slot Fix)
'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Button,
  Badge,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  PremiumSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  DataTableColumnHeader,
} from '@headlines/ui'
import {
  ArrowUpDown,
  MoreHorizontal,
  Building,
  User,
  Users,
  Trash2,
  PlusCircle,
  X,
  Check,
} from 'lucide-react'

// --- Shared Components ---

const TypeIcon = ({ type }) => {
  if (type === 'person') return <User className="h-5 w-5 text-blue-400" />
  if (type === 'family') return <Users className="h-5 w-5 text-purple-400" />
  return <Building className="h-5 w-5 text-orange-400" />
}

const EditableTermBadge = ({ term, onUpdate, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(term)
  const inputRef = useRef(null)
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])
  const handleSave = () => {
    if (editText.trim() && editText.trim().toLowerCase() !== term) {
      onUpdate(term, editText.trim().toLowerCase())
    }
    setIsEditing(false)
  }
  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') setIsEditing(false)
        }}
        className="h-6 text-xs w-auto inline-flex"
        style={{ width: `${Math.max(editText.length, 5)}ch` }}
      />
    )
  }
  return (
    <Badge
      variant="secondary"
      className="group cursor-pointer"
      onClick={() => setIsEditing(true)}
    >
      {' '}
      {term}{' '}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove(term)
        }}
        className="ml-1.5 opacity-50 group-hover:opacity-100 rounded-full hover:bg-background/50"
      >
        {' '}
        <X className="h-3 w-3" />{' '}
      </button>{' '}
    </Badge>
  )
}

const SearchTermManager = ({ entity, onUpdate }) => {
  const [newTerm, setNewTerm] = useState('')
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const handleUpdateTerms = (newTerms) => {
    onUpdate(entity, { searchTerms: [...new Set(newTerms)] })
  }
  const handleAddTerm = () => {
    if (newTerm.trim()) {
      handleUpdateTerms([...(entity.searchTerms || []), newTerm.trim().toLowerCase()])
      setNewTerm('')
      setIsPopoverOpen(false)
    }
  }
  const handleRemoveTerm = (termToRemove) => {
    handleUpdateTerms((entity.searchTerms || []).filter((t) => t !== termToRemove))
  }
  const handleUpdateTerm = (oldTerm, newTerm) => {
    handleUpdateTerms(
      (entity.searchTerms || []).map((t) => (t === oldTerm ? newTerm : t))
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-1 max-w-md">
      {(entity.searchTerms || []).map((term) => (
        <EditableTermBadge
          key={term}
          term={term}
          onUpdate={handleUpdateTerm}
          onRemove={handleRemoveTerm}
        />
      ))}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full">
            <PlusCircle className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <div className="flex items-center gap-1">
            <Input
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTerm()}
              placeholder="Add term..."
              className="h-7 text-xs"
            />
            <Button
              size="icon"
              variant="default"
              className="h-7 w-7"
              onClick={handleAddTerm}
            >
              {' '}
              <PlusCircle className="h-4 w-4" />{' '}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// --- Column Definitions ---

export const watchlistColumns = (
  handleEdit,
  onUpdate,
  onDelete,
  availableCountries = []
) => [
  {
    accessorKey: 'hitCount',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {' '}
        Hits <ArrowUpDown className="ml-2 h-4 w-4" />{' '}
      </Button>
    ),
    cell: ({ row }) => {
      const hitCount = row.getValue('hitCount')
      if (hitCount === 'recalculating') {
        return (
          <div className="flex justify-center items-center h-full">
            {' '}
            <div className="w-6 h-6">
              {' '}
              <PremiumSpinner size={24} />{' '}
            </div>{' '}
          </div>
        )
      }
      return <div className="text-center font-medium">{hitCount || 0}</div>
    },
  },
  // DEFINITIVE FIX: Replace the simple sortable button with the new DataTableColumnHeader.
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {' '}
        <TypeIcon type={row.original.type} />{' '}
        <span className="font-medium">{row.getValue('name')}</span>{' '}
      </div>
    ),
  },
  {
    accessorKey: 'searchTerms',
    header: 'Search Terms',
    cell: ({ row }) => <SearchTermManager entity={row.original} onUpdate={onUpdate} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const entity = row.original
      const statuses = ['candidate', 'active', 'inactive']
      const currentStatusIndex = statuses.indexOf(entity.status)
      const nextStatus = statuses[(currentStatusIndex + 1) % statuses.length]
      const colorClass = {
        active:
          'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30',
        inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30',
        candidate:
          'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30',
      }[entity.status]
      return (
        <Badge
          variant="outline"
          className={`cursor-pointer transition-colors ${colorClass}`}
          onClick={() => onUpdate(entity, { status: nextStatus })}
        >
          {' '}
          {entity.status}{' '}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'country',
    header: 'Country',
    cell: ({ row }) => {
      const entity = row.original
      return (
        <Select
          value={entity.country || ''}
          onValueChange={(value) => onUpdate(entity, { country: value })}
        >
          {' '}
          <SelectTrigger className="w-32 h-8 text-xs bg-transparent border-none focus:ring-0 shadow-none">
            {' '}
            <SelectValue placeholder="Select..." />{' '}
          </SelectTrigger>{' '}
          <SelectContent>
            {' '}
            {availableCountries.map((c) => (
              <SelectItem key={c} value={c}>
                {' '}
                {c}{' '}
              </SelectItem>
            ))}{' '}
          </SelectContent>{' '}
        </Select>
      )
    },
    filterFn: (row, id, value) => value === row.getValue(id),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const entity = row.original
      return (
        <div className="text-right">
          {' '}
          <DropdownMenu>
            {' '}
            <DropdownMenuTrigger asChild>
              {' '}
              <Button variant="ghost" className="h-8 w-8 p-0">
                {' '}
                <span className="sr-only">Open menu</span>{' '}
                <MoreHorizontal className="h-4 w-4" />{' '}
              </Button>{' '}
            </DropdownMenuTrigger>{' '}
            <DropdownMenuContent align="end">
              {' '}
              <DropdownMenuLabel>Actions</DropdownMenuLabel>{' '}
              <DropdownMenuItem onClick={() => handleEdit(entity._id)}>
                {' '}
                Edit Details{' '}
              </DropdownMenuItem>{' '}
              <DropdownMenuSeparator />{' '}
              <DropdownMenuItem
                className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                onClick={() => onDelete(entity._id)}
              >
                {' '}
                <Trash2 className="mr-2 h-4 w-4" /> Delete{' '}
              </DropdownMenuItem>{' '}
            </DropdownMenuContent>{' '}
          </DropdownMenu>{' '}
        </div>
      )
    },
  },
]

export const suggestionColumns = (onAction, onUpdate) => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {' '}
        Name <ArrowUpDown className="ml-2 h-4 w-4" />{' '}
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {' '}
        <TypeIcon type={row.original.type} />{' '}
        <span className="font-medium">{row.getValue('name')}</span>{' '}
      </div>
    ),
  },
  { accessorKey: 'country', header: 'Country' },
  {
    accessorKey: 'rationale',
    header: 'AI Rationale',
    cell: ({ row }) => (
      <div className="truncate max-w-sm">{row.getValue('rationale')}</div>
    ),
  },
  {
    accessorKey: 'searchTerms',
    header: 'Suggested Search Terms',
    cell: ({ row }) => <SearchTermManager entity={row.original} onUpdate={onUpdate} />,
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
          {' '}
          <TooltipProvider>
            {' '}
            <Tooltip>
              {' '}
              <TooltipTrigger asChild>
                {' '}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-400 hover:bg-green-500/10 hover:text-green-400"
                  onClick={() => onAction(suggestion, 'approved')}
                >
                  {' '}
                  <Check className="h-4 w-4" />{' '}
                </Button>{' '}
              </TooltipTrigger>{' '}
              <TooltipContent>
                {' '}
                <p>Approve and add to watchlist</p>{' '}
              </TooltipContent>{' '}
            </Tooltip>{' '}
            <Tooltip>
              {' '}
              <TooltipTrigger asChild>
                {' '}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => onAction(suggestion, 'dismissed')}
                >
                  {' '}
                  <X className="h-4 w-4" />{' '}
                </Button>{' '}
              </TooltipTrigger>{' '}
              <TooltipContent>
                {' '}
                <p>Dismiss this suggestion</p>{' '}
              </TooltipContent>{' '}
            </Tooltip>{' '}
          </TooltipProvider>{' '}
        </div>
      )
    },
  },
]
