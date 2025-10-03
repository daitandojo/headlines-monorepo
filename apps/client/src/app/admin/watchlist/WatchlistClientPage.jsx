// apps/client/src/app/admin/watchlist/WatchlistClientPage.jsx
'use client'

import { useState, useMemo, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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

export default function WatchlistClientPage({
  initialWatchlist,
  total,
  initialSuggestions,
  availableCountries,
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = parseInt(searchParams.get('page') || '1', 10)
  const sortParam = searchParams.get('sort') || ''
  const filterParam = searchParams.get('filters') || '[]'

  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [confirmState, setConfirmState] = useState({ isOpen: false, entityId: null })
  const [sorting, setSorting] = useState(
    sortParam
      ? [{ id: sortParam.split('_')[0], desc: sortParam.split('_')[1] === 'desc' }]
      : []
  )
  const [columnFilters, setColumnFilters] = useState(JSON.parse(filterParam))

  const updateUrlParams = useCallback(
    ({ page, sorting, filters }) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', page.toString())
      if (sorting?.length > 0) {
        params.set('sort', `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}`)
      } else {
        params.delete('sort')
      }
      if (filters?.length > 0) {
        params.set('filters', JSON.stringify(filters))
      } else {
        params.delete('filters')
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const handlePageChange = (newPage) =>
    updateUrlParams({ page: newPage, sorting, filters: columnFilters })
  const handleSortChange = (newSorting) =>
    updateUrlParams({ page: 1, sorting: newSorting, filters: columnFilters })
  const handleFilterChange = (newFilters) =>
    updateUrlParams({ page: 1, sorting, filters: newFilters })

  const handleEdit = (id) => {
    setSelectedId(id)
    setIsEditorOpen(true)
  }

  const handleAdd = () => {
    setSelectedId('new')
    setIsEditorOpen(true)
  }

  const handleEntityUpdate = useCallback(async (entity, updateData) => {
    toast.promise(updateEntityAction(entity._id, updateData), {
      loading: 'Updating entity...',
      success: 'Entity updated.',
      error: (err) => `Update failed: ${err.message}`,
    })
  }, [])

  const handleSuggestionAction = async (suggestion, action) => {
    setSuggestions((prev) => prev.filter((s) => s._id !== suggestion._id)) // Optimistic removal
    toast.promise(processSuggestionAction(suggestion._id, action), {
      loading: `Processing suggestion "${suggestion.name}"...`,
      success: (result) => result.message,
      error: (err) => `Failed to ${action} suggestion: ${err.message}`,
    })
  }

  const handleDelete = (entityId) => setConfirmState({ isOpen: true, entityId })
  const confirmDelete = async () => {
    const { entityId } = confirmState
    setConfirmState({ isOpen: false, entityId: null })
    toast.promise(deleteEntityAction(entityId), {
      loading: 'Deleting entity...',
      success: 'Entity deleted.',
      error: (err) => `Deletion failed: ${err.message}`,
    })
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
    return initialWatchlist?.find((e) => e._id === selectedId) || null
  }, [selectedId, initialWatchlist])

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
              data={initialWatchlist}
              total={total}
              page={page}
              setPage={handlePageChange}
              sorting={sorting}
              setSorting={handleSortChange}
              columnFilters={columnFilters}
              setColumnFilters={handleFilterChange}
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
            onSave={() => setIsEditorOpen(false)}
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
