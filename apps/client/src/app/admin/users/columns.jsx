// File: apps/client/src/app/admin/users/columns.jsx (version 3.0 - Server Actions)
'use client'

import React from 'react'
import {
  Button,
  DataTableColumnHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  EditableCell,
} from '@/components/shared'
import { UserCheck, UserX, ShieldCheck, User, Globe, Edit, Trash2 } from 'lucide-react'
import { SUBSCRIPTION_TIERS } from '@headlines/models/client'

export const columns = (handleEdit, handleAction) => [
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">{user.email}</span>
          {/* --- START OF THE FIX --- */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <EditableCell
              initialValue={user.firstName}
              onSave={(newValue) =>
                handleAction(user, 'updateFirstName', { firstName: newValue })
              }
              placeholder="First Name..."
            />
            <EditableCell
              initialValue={user.lastName}
              onSave={(newValue) =>
                handleAction(user, 'updateLastName', { lastName: newValue })
              }
              placeholder="Last Name..."
            />
          </div>
          {/* --- END OF THE FIX --- */}
        </div>
      )
    },
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => {
      const user = row.original
      return (
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 ${user.isActive ? 'text-green-500' : 'text-muted-foreground'}`}
          onClick={() => handleAction(user, 'toggleActive', { isActive: !user.isActive })}
        >
          {user.isActive ? (
            <UserCheck className="h-4 w-4" />
          ) : (
            <UserX className="h-4 w-4" />
          )}
          {user.isActive ? 'Active' : 'Inactive'}
        </Button>
      )
    },
  },
  {
    accessorKey: 'subscriptionTier',
    header: 'Tier',
    cell: ({ row }) => {
      const user = row.original
      return (
        <Select
          value={user.subscriptionTier}
          onValueChange={(newTier) =>
            handleAction(user, 'updateTier', { subscriptionTier: newTier })
          }
        >
          <SelectTrigger className="w-32 h-8 text-xs capitalize bg-transparent border-none focus:ring-0 shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBSCRIPTION_TIERS.map((tier) => (
              <SelectItem key={tier} value={tier} className="capitalize">
                {tier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const user = row.original
      return (
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 capitalize ${user.role === 'admin' ? 'text-yellow-400' : 'text-muted-foreground'}`}
          onClick={() =>
            handleAction(user, 'toggleRole', {
              role: user.role === 'admin' ? 'user' : 'admin',
            })
          }
        >
          {user.role === 'admin' ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
          {user.role}
        </Button>
      )
    },
  },
  {
    accessorKey: 'countries',
    header: 'Countries',
    cell: ({ row }) => {
      const user = row.original
      if (user.role === 'admin')
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-4 w-4" /> All Countries
          </div>
        )
      const count = user.countries?.length || 0
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Globe className="h-4 w-4" /> {count} countries
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="text-right flex justify-end items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleEdit(user._id.toString())}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500/80 hover:text-red-500"
            onClick={() => handleAction(user, 'delete')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  },
]
