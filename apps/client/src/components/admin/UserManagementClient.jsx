// src/components/admin/UserManagementClient.jsx (version 1.0)
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createSubscriber,
  updateSubscriber,
  deleteSubscriber,
  getAllSubscribers,
} from '@/actions/admin'
import { UserDataTable } from './users/UserDataTable'
import { columns } from './users/columns'
import { toast } from 'sonner'

export function UserManagementClient({ initialUsers }) {
  const queryClient = useQueryClient()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const {
    data: users,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const result = await getAllSubscribers()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    initialData: initialUsers,
    refetchOnWindowFocus: false,
  })

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setIsFormOpen(false)
      setEditingUser(null)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  }

  const { mutate: createUser, isPending: isCreating } = useMutation({
    mutationFn: createSubscriber,
    ...mutationOptions,
    onSuccess: () => {
      toast.success('User invited successfully.')
      mutationOptions.onSuccess()
    },
  })

  const { mutate: editUser, isPending: isEditing } = useMutation({
    mutationFn: (vars) => updateSubscriber(vars.id, vars.data),
    ...mutationOptions,
    onSuccess: () => {
      toast.success('User updated successfully.')
      mutationOptions.onSuccess()
    },
  })

  const { mutate: removeUser } = useMutation({
    mutationFn: deleteSubscriber,
    ...mutationOptions,
    onSuccess: () => {
      toast.success('User deleted successfully.')
      mutationOptions.onSuccess()
    },
  })

  const handleSaveUser = (userData) => {
    if (editingUser) {
      editUser({ id: editingUser._id, data: userData })
    } else {
      createUser(userData)
    }
  }

  return (
    <div>
      {isError && <p className="text-red-500">Failed to load users.</p>}
      <UserDataTable
        columns={columns({ setEditingUser, removeUser })}
        data={users || []}
        isLoading={isLoading}
        isFormOpen={isFormOpen}
        setIsFormOpen={setIsFormOpen}
        editingUser={editingUser}
        setEditingUser={setEditingUser}
        onSave={handleSaveUser}
        isSaving={isCreating || isEditing}
      />
    </div>
  )
}
