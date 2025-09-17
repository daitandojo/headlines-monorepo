// apps/admin/src/app/users/columns.jsx (version 2.1.0)
'use client'

import React from 'react'
import { Button } from '@headlines/ui/src/index.js'
import { Popover, PopoverTrigger, PopoverContent } from '@headlines/ui/src/index.js'
import { MultiSelect } from '../_components/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@headlines/ui/src/index.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@headlines/ui/src/index.js'
import {
  ArrowUpDown,
  MoreHorizontal,
  UserCheck,
  UserX,
  ShieldCheck,
  User,
  Trash2,
  Globe,
  Star,
  Mail,
  MailMinus,
  Bell,
  BellOff,
  Edit,
  Newspaper,
  Languages,
} from 'lucide-react'
import { SUBSCRIPTION_TIERS, SUBSCRIBER_ROLES } from '@headlines/models/constants'

const InlineCountryEditor = ({ user, allCountries, onAction }) => {
  const subscribedCountryNames = (user.countries || []).map((c) => c.name)

  const handleSelectionChange = (newSelection) => {
    const newSubscriptions = newSelection.map((name) => {
      const existing = user.countries.find((c) => c.name === name)
      return existing || { name, active: true }
    })
    onAction(user, 'updateCountries', { countries: newSubscriptions })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-1 text-left justify-start">
          <Edit className="h-3 w-3 mr-2 flex-shrink-0" />
          <span className="truncate max-w-[200px]">
            {subscribedCountryNames.length > 0
              ? subscribedCountryNames.join(', ')
              : 'No subscriptions'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <MultiSelect
          options={allCountries}
          selected={subscribedCountryNames}
          onChange={handleSelectionChange}
          placeholder="Select subscriptions..."
        />
      </PopoverContent>
    </Popover>
  )
}

const InlineLanguageEditor = ({ user, availableLanguages, onAction }) => {
  const handleLanguageChange = (newLanguage) => {
    onAction(user, 'updateLanguage', { language: newLanguage })
  }

  return (
    <Select value={user.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-40 h-8 text-xs bg-transparent border-none focus:ring-0 shadow-none">
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        {availableLanguages.map((lang) => (
          <SelectItem key={lang} value={lang}>
            {lang}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export const columns = (
  handleEdit,
  handleAction,
  allCountries = [],
  availableLanguages = []
) => [
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Email <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.email}</span>
        <span className="text-muted-foreground text-xs">
          {row.original.firstName} {row.original.lastName || ''}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => {
      const user = row.original
      const Icon = user.isActive ? UserCheck : UserX
      const color = user.isActive ? 'text-green-500' : 'text-muted-foreground'
      const text = user.isActive ? 'Active' : 'Inactive'
      return (
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 ${color}`}
          onClick={() => handleAction(user, 'toggleActive')}
        >
          <Icon className="h-4 w-4" /> {text}
        </Button>
      )
    },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const user = row.original
      const Icon = user.role === 'admin' ? ShieldCheck : User
      const color = user.role === 'admin' ? 'text-yellow-400' : 'text-muted-foreground'
      return (
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 capitalize ${color}`}
          onClick={() => handleAction(user, 'toggleRole')}
        >
          <Icon className="h-4 w-4" /> {user.role}
        </Button>
      )
    },
  },
  {
    accessorKey: 'language',
    header: 'Language',
    cell: ({ row }) => {
      const user = row.original
      return (
        <InlineLanguageEditor
          user={user}
          availableLanguages={availableLanguages}
          onAction={handleAction}
        />
      )
    },
  },
  {
    accessorKey: 'countries',
    header: 'Countries',
    cell: ({ row }) => {
      const user = row.original
      if (user.role === 'admin') {
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-4 w-4" />
            All Countries
          </div>
        )
      }
      return (
        <InlineCountryEditor
          user={user}
          allCountries={allCountries}
          onAction={handleAction}
        />
      )
    },
  },
  {
    id: 'notifications',
    header: 'Engagement',
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction(user, 'toggleEmail')}
              title={user.emailNotificationsEnabled ? 'Email Enabled' : 'Email Disabled'}
            >
              {user.emailNotificationsEnabled ? (
                <Mail className="h-5 w-5 text-green-400" />
              ) : (
                <MailMinus className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => handleAction(user, 'togglePush')}
              title={user.pushNotificationsEnabled ? 'Push Enabled' : 'Push Disabled'}
            >
              {user.pushNotificationsEnabled ? (
                <Bell className="h-5 w-5 text-green-400" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1" title="Emails Sent">
              <Mail className="h-3 w-3" />
              <span>{user.emailSentCount || 0}</span>
            </div>
            <div className="flex items-center gap-1" title="Events Received">
              <Newspaper className="h-3 w-3" />
              <span>{user.eventsReceivedCount || 0}</span>
            </div>
          </div>
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original
      return (
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
              <DropdownMenuItem onClick={() => handleEdit(user._id)}>
                Edit Full Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                onClick={() => handleAction(user, 'delete')}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]
