// apps/admin/src/app/(protected)/users/page.jsx (version 7.0.1)
'use client'

import { ServerCrash, PlusCircle } from 'lucide-react'
import {
  PageHeader,
  Button,
  ConfirmationDialog,
  Sheet,
  SheetContent,
  DataTable,
} from '@components/shared'
import { useEntityManager } from '@/hooks/use-entity-manager'
import { columns } from './columns'
import UserEditor from './user-editor'
import { toast } from 'sonner'
import { useMemo, useState, useCallback } from 'react'
import { languageList } from '@shared/utils-shared'
import { deleteSubscriber, updateSubscriber } from '@/lib/api-client'
import {
  API_SUBSCRIBERS,
  QUERY_KEY_SUBSCRIBERS,
  API_COUNTRIES,
  QUERY_KEY_COUNTRIES,
} from '@/lib/constants'

export default function UsersPage() {
  const {
    data: users,
    setData: setUsers,
    total: totalUsers,
    isLoading: isLoadingUsers,
    error: usersError,
    handleSave,
    refetch,
    page,
    setPage,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  } = useEntityManager(API_SUBSCRIBERS, QUERY_KEY_SUBSCRIBERS, [
    { id: 'createdAt', desc: true },
  ])

  const {
    entities: countries,
    isLoading: isLoadingCountries,
    error: countriesError,
  } = useEntityManager(API_COUNTRIES, QUERY_KEY_COUNTRIES)

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    data: null,
    action: null,
  })

  const availableCountries = useMemo(() => {
    if (!countries) return []
    return countries.filter((c) => c.status === 'active').map((c) => c.name)
  }, [countries])

  const handleEdit = (id) => {
    setSelectedId(id)
    setIsEditorOpen(true)
  }
  const handleAdd = () => {
    setSelectedId('new')
    setIsEditorOpen(true)
  }

  const handleAction = useCallback(
    async (user, action, data) => {
      if (action === 'delete') {
        setConfirmState({ isOpen: true, data: { user }, action })
        return
      }
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, ...data } : u)))
      const result = await updateSubscriber(user._id, data)
      if (result.error) {
        toast.error(`Update failed: ${result.error}`)
        refetch()
      }
    },
    [setUsers, refetch]
  )

  const confirmAction = useCallback(async () => {
    const { action, data } = confirmState
    setConfirmState({ isOpen: false, data: null, action: null })
    const toastId = toast.loading(`Performing action: ${action}...`)
    if (action === 'delete') {
      const result = await deleteSubscriber(data.user._id)
      if (result.error) {
        toast.error(`Action failed: ${result.error}`, { id: toastId })
      } else {
        toast.success('Action completed successfully.', { id: toastId })
        refetch()
      }
    }
  }, [confirmState, refetch])

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
        isLifetimeFree: false,
        subscriptionExpiresAt: null,
        language: 'English',
      }
    return users?.find((u) => u._id === selectedId) || null
  }, [selectedId, users])

  const error = usersError || countriesError
  const isLoading = isLoadingUsers || isLoadingCountries

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-center p-4">
        <div className="p-8 rounded-lg bg-destructive/10 border border-destructive/50 max-w-md">
          <ServerCrash className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold">Failed to Load Users</h1>
          <p className="text-destructive-foreground/80 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="User Management"
        description={`Manage all ${totalUsers.toLocaleString()} system users.`}
      >
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New User
        </Button>
      </PageHeader>
      <div className="mt-8 flex-grow min-h-0">
        <DataTable
          columns={columns(handleEdit, handleAction, availableCountries, languageList)}
          data={users || []}
          isLoading={isLoading}
          page={page}
          setPage={setPage}
          total={totalUsers}
          sorting={sorting}
          setSorting={setSorting}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
          filterColumn="email"
          filterPlaceholder="Filter by email..."
        />
      </div>
      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <UserEditor
            key={selectedId}
            user={activeUserData}
            onSave={(saved) => {
              handleSave(saved)
              setIsEditorOpen(false)
            }}
            onCancel={() => setIsEditorOpen(false)}
            availableCountries={availableCountries}
            availableLanguages={languageList}
          />
        </SheetContent>
      </Sheet>
      <ConfirmationDialog
        open={confirmState.isOpen}
        onOpenChange={(isOpen) => setConfirmState({ ...confirmState, isOpen })}
        onConfirm={confirmAction}
        title={`Confirm Action: ${confirmState.action}`}
        description={`Are you sure you want to ${confirmState.action} user ${confirmState.data?.user?.email}? This may be irreversible.`}
      />
    </div>
  )
}
