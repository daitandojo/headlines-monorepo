'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  PageHeader,
  Button,
  Sheet,
  SheetContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ConfirmationDialog,
  DataTable,
} from '@/components/shared'
import { PlusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { watchlistColumns, suggestionColumns } from './columns'
import WatchlistEditor from './watchlist-editor'
import {
  updateEntityAction,
  deleteEntityAction,
  processSuggestionAction,
} from './actions'
import { useEntityManager } from '@/hooks/use-entity-manager'

export default function WatchlistClientPage({
  initialWatchlist,
  initialSuggestions,
  availableCountries,
}) {
  const {
    data: watchlist,
    setData: setWatchlist,
    total,
    isLoading,
    page,
    setPage,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  } = useEntityManager('watchlist', initialWatchlist, initialWatchlist.length)

  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [confirmState, setConfirmState] = useState({ isOpen: false, entityId: null })

  const handleEdit = (id) => {
    setSelectedId(id)
    setIsEditorOpen(true)
  }

  const handleAdd = () => {
    setSelectedId('new')
    setIsEditorOpen(true)
  }

  const handleEntityUpdate = useCallback(async (entity, updateData) => {
    // Optimistic UI update
    setWatchlist((prev) =>
      prev.map((e) => (e._id === entity._id ? { ...e, ...updateData } : e))
    )

    const result = await updateEntityAction(entity._id, updateData)

    if (!result.success) {
      toast.error('Update failed. Reverting.')
      // Revert optimistic update on failure by reloading the page
      window.location.reload()
    }
  }, [])

  const handleSuggestionAction = async (suggestion, action) => {
    const toastId = toast.loading(`Processing suggestion "${suggestion.name}"...`)
    setSuggestions((prev) => prev.filter((s) => s._id !== suggestion._id)) // Optimistic removal
    const result = await processSuggestionAction(suggestion._id, action)
    if (result.success) {
      toast.success(result.message, { id: toastId })
    } else {
      toast.error(`Failed to ${action} suggestion: ${result.error}`, { id: toastId })
      setSuggestions(initialSuggestions) // Revert on failure
    }
  }

  const handleDelete = (entityId) => setConfirmState({ isOpen: true, entityId })
  const confirmDelete = async () => {
    const { entityId } = confirmState
    setConfirmState({ isOpen: false, entityId: null })
    const toastId = toast.loading('Deleting entity...')
    const result = await deleteEntityAction(entityId)
    if (result.success) {
      toast.success('Entity deleted.', { id: toastId })
    } else {
      toast.error(`Deletion failed: ${result.error}`, { id: toastId })
    }
  }

  const activeEntityData = useMemo(() => {
    if (selectedId === 'new')
      return {
        _id: null,
        name: '',
        type: 'company',
        status: 'candidate',
        context: '',
        country: '',
        searchTerms: [],
      }
    return watchlist?.find((e) => e._id === selectedId) || null
  }, [selectedId, watchlist])

  return (
    <>
      <PageHeader
        title="Watchlist Management"
        description={`Manage ${total.toLocaleString()} entities and review ${suggestions.length} AI-generated suggestions.`}
      >
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Entity
        </Button>
      </PageHeader>
      <div className="mt-8 flex-grow min-h-0">
        <Tabs defaultValue="watchlist" className="h-full flex flex-col">
          <TabsList>
            <TabsTrigger value="watchlist">
              Monitored Entities ({total.toLocaleString()})
            </TabsTrigger>
            <TabsTrigger value="suggestions">
              AI Suggestions ({suggestions.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="watchlist" className="flex-grow min-h-0">
            <DataTable
              columns={watchlistColumns(handleEdit, handleEntityUpdate, handleDelete)}
              data={watchlist}
              isLoading={isLoading}
              total={total}
              page={page}
              setPage={setPage}
              sorting={sorting}
              setSorting={setSorting}
              columnFilters={columnFilters}
              setColumnFilters={setColumnFilters}
              filterColumn="name"
              filterPlaceholder="Filter by name..."
            />
          </TabsContent>
          <TabsContent value="suggestions" className="flex-grow min-h-0">
            <DataTable
              columns={suggestionColumns(handleSuggestionAction)}
              data={suggestions}
              filterColumn="name"
              filterPlaceholder="Filter by name..."
            />
          </TabsContent>
        </Tabs>
      </div>
      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <WatchlistEditor
            key={selectedId}
            entity={activeEntityData}
            onSave={() => setIsEditorOpen(false)} // The editor's action now triggers a revalidation
            onCancel={() => setIsEditorOpen(false)}
            countries={availableCountries}
          />
        </SheetContent>
      </Sheet>
      <ConfirmationDialog
        open={confirmState.isOpen}
        onOpenChange={(isOpen) => setConfirmState({ ...confirmState, isOpen })}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        description="Are you sure you want to delete this entity? This action cannot be undone."
        confirmText="Delete Entity"
      />
    </>
  )
}
