// apps/client/src/app/admin/users/UsersClientPage.jsx
'use client'

import { useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  DataTable,
  Button,
  ConfirmationDialog,
  Sheet,
  SheetContent,
} from '@/components/shared'
import { PlusCircle } from 'lucide-react'
import { columns } from './columns'
import UserEditor from './user-editor'
import { updateUserAction, deleteUserAction, createUserAction } from './actions'
import { languageList } from '@headlines/utils-shared'

export default function UsersClientPage({ initialUsers, initialTotal, allCountries }) {
  const [users, setUsers] = useState(initialUsers)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [confirmState, setConfirmState] = useState({ isOpen: false, user: null })

  const handleAction = useCallback(async (user, action, data) => {
    if (action === 'delete') {
      setConfirmState({ isOpen: true, user })
      return
    }

    setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, ...data } : u)))

    const result = await updateUserAction(user._id, data)
    if (!result.success) {
      toast.error(`Update failed: ${result.error}`)
      // Revert optimistic update on failure by reloading the page
      window.location.reload()
    }
  }, [])

  const confirmDelete = useCallback(async () => {
    const userToDelete = confirmState.user
    setConfirmState({ isOpen: false, user: null })
    if (!userToDelete) return

    const toastId = toast.loading('Deleting user...')
    const result = await deleteUserAction(userToDelete._id)

    if (!result.success) {
      toast.error(`Deletion failed: ${result.error}`, { id: toastId })
    } else {
      toast.success('User deleted successfully.', { id: toastId })
    }
  }, [confirmState.user])

  const handleSaveEditor = async (userData) => {
    const isNew = !userData._id
    const action = isNew
      ? createUserAction
      : (data) => updateUserAction(userData._id, data)
    const toastId = toast.loading(isNew ? 'Creating user...' : 'Updating user...')

    const result = await action(userData)

    if (result.success) {
      toast.success(`User ${isNew ? 'created' : 'updated'}.`, { id: toastId })
      setIsEditorOpen(false)
    } else {
      toast.error(`Failed to save: ${result.error}`, { id: toastId })
    }
  }

  const activeUserData = useMemo(() => {
    if (selectedId === 'new')
      return {
        _id: null,
        email: '',
        firstName: '',
        lastName: '',
        role: 'user',
        isActive: true,
        countries: [],
        password: '',
        emailNotificationsEnabled: true,
        pushNotificationsEnabled: true,
        subscriptionTier: 'free',
        language: 'English',
      }
    return users.find((u) => u._id.toString() === selectedId) || null
  }, [selectedId, users])

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setSelectedId('new')
            setIsEditorOpen(true)
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add New User
        </Button>
      </div>
      <div className="mt-8 flex-grow min-h-0">
        <DataTable
          columns={columns((id) => {
            setSelectedId(id)
            setIsEditorOpen(true)
          }, handleAction)}
          data={users}
        />
      </div>
      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <UserEditor
            key={selectedId}
            user={activeUserData}
            onSave={handleSaveEditor}
            onCancel={() => setIsEditorOpen(false)}
            availableCountries={allCountries}
            availableLanguages={languageList}
          />
        </SheetContent>
      </Sheet>
      <ConfirmationDialog
        open={confirmState.isOpen}
        onOpenChange={(isOpen) => setConfirmState({ ...confirmState, isOpen })}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        description={`Are you sure you want to delete user ${confirmState.user?.email}?`}
      />
    </>
  )
}
