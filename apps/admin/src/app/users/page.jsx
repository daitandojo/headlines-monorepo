// apps/admin/src/app/users/page.jsx (version 5.2.0 - Definitive Sheet Fix)
'use client'

import { ServerCrash, PlusCircle, UserCheck, UserX, Trash2 } from 'lucide-react'
import { PageHeader, Button, ConfirmationDialog, Sheet, SheetContent, DataTable } from '@headlines/ui/src/index.js'
import { useEntityManager } from '@/hooks/use-entity-manager'
import { columns } from './columns'
import UserEditor from './user-editor'
import { toast } from 'sonner'
import { useMemo, useState, useCallback } from 'react'
import { languageList } from '@headlines/utils/src/index.js'

// API call functions are defined locally to avoid complex imports
async function deleteSubscriber(userId) {
    const res = await fetch(`/api/subscribers/${userId}`, { method: 'DELETE' });
    return res.json();
}
async function updateSubscriber(userId, updateData) {
    const res = await fetch(`/api/subscribers/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData) });
    return res.json();
}
async function updateSubscribersStatus(userIds, isActive) { return { success: true }; }
async function deleteSubscribers(userIds) { return { success: true }; }


export default function UsersPage() {
  const { entities: users, setEntities, isLoading: isLoadingUsers, error: usersError, handleSave, refetch, } = useEntityManager('/api/subscribers', 'Subscriber', 'email')
  const { entities: countries, isLoading: isLoadingCountries, error: countriesError, } = useEntityManager('/api/countries', 'Country', 'name')

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [confirmState, setConfirmState] = useState({ isOpen: false, data: null, action: null, })

  const availableCountries = useMemo(() => {
    if (!countries) return []
    return countries.filter((c) => c.status === 'active').map((c) => c.name)
  }, [countries])

  const handleEdit = (id) => { setSelectedId(id); setIsEditorOpen(true); }
  const handleAdd = () => { setSelectedId('new'); setIsEditorOpen(true); }

  const handleAction = useCallback( (user, action, data) => {
      if (action === 'delete') {
        setConfirmState({ isOpen: true, data: { user }, action })
        return
      }
      handleSave(user)
      updateSubscriber(user._id, data).then((result) => {
        if (!result.subscriber) {
          toast.error(`Update failed: ${result.error}`)
          refetch();
        }
      })
    }, [handleSave, refetch]
  )

  const confirmAction = useCallback(async () => {
    const { action, data } = confirmState
    setConfirmState({ isOpen: false, data: null, action: null })
    const toastId = toast.loading(`Performing action: ${action}...`)
    
    if (action === 'delete') {
      setEntities(currentUsers => currentUsers.filter(u => u._id !== data.user._id));
      const result = await deleteSubscriber(data.user._id);
      if (result.error) {
        toast.error(`Action failed: ${result.error}`, { id: toastId });
        refetch();
      } else {
        toast.success('Action completed successfully.', { id: toastId });
      }
    }
  }, [confirmState, setEntities, refetch])

  const activeUserData = useMemo(() => {
    if (selectedId === 'new') return { _id: null, email: '', firstName: '', lastName: '', role: 'user', isActive: true, countries: [], password: '', emailNotificationsEnabled: true, pushNotificationsEnabled: true, subscriptionTier: 'free', isLifetimeFree: false, subscriptionExpiresAt: null, language: 'English', }
    return users?.find((u) => u._id === selectedId) || null
  }, [selectedId, users])

  const error = usersError || countriesError
  const isLoading = isLoadingUsers || isLoadingCountries

  if (error) { return ( <div className="flex h-full w-full items-center justify-center text-center p-4"> <div className="p-8 rounded-lg bg-destructive/10 border border-destructive/50 max-w-md"> <ServerCrash className="w-12 h-12 mx-auto text-destructive mb-4" /> <h1 className="text-2xl font-bold">Failed to Load Users</h1> <p className="text-destructive-foreground/80 mt-2">{error}</p> </div> </div> ) }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="User Management" description="Add, edit, and manage user accounts and their country subscriptions." >
        <Button onClick={handleAdd}> <PlusCircle className="mr-2 h-4 w-4" /> Add New User </Button>
      </PageHeader>

      <div className="mt-8 flex-grow min-h-0">
        <DataTable columns={columns(handleEdit, handleAction, availableCountries, languageList)} data={users || []} isLoading={isLoading} filterColumn="email" filterPlaceholder="Filter by email..." enableRowSelection={true} onRowSelectionChange={setSelectedUsers} />
      </div>

      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        {/* DEFINITIVE FIX: The SheetContent component now has a single direct child, UserEditor. */}
        {/* The header logic is handled inside UserEditor itself. */}
        <SheetContent className="w-full sm:max-w-lg p-0">
          <UserEditor key={selectedId} user={activeUserData} onSave={(saved) => { handleSave(saved); setIsEditorOpen(false); }} onCancel={() => setIsEditorOpen(false)} availableCountries={availableCountries} availableLanguages={languageList} />
        </SheetContent>
      </Sheet>

      <ConfirmationDialog open={confirmState.isOpen} onOpenChange={(isOpen) => setConfirmState({ ...confirmState, isOpen })} onConfirm={confirmAction} title={`Confirm Action: ${confirmState.action}`} description={`Are you sure you want to ${confirmState.action} ${confirmState.data?.count || `user ${confirmState.data?.user?.email}`}? This may be irreversible.`} />
    </div>
  )
}
