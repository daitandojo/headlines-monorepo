// apps/admin/src/app/watchlist/page.jsx (version 3.3.0 - Sheet Fix)
'use client'

import { useMemo, useState, useCallback } from 'react'
import { ServerCrash, PlusCircle } from 'lucide-react'
import { PageHeader, Button, Sheet, SheetContent, Tabs, TabsContent, TabsList, TabsTrigger, ConfirmationDialog } from '@headlines/ui/src/index.js'
import { useEntityManager } from '@/hooks/use-entity-manager'
import { watchlistColumns, suggestionColumns } from './columns'
import { DataTable } from '@headlines/ui/src/index.js'
import WatchlistEditor from './watchlist-editor'
import { toast } from 'sonner'
import { processWatchlistSuggestion, updateWatchlistEntity, deleteWatchlistEntity } from '@headlines/data-access/src/index.js'

async function updateWatchlistSuggestion_local(suggestionId, updateData) {
    const res = await fetch(`/api/watchlist/suggestions/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
    });
    return res.json();
}

export default function WatchlistPage() {
  const { entities: watchlist, setEntities: setWatchlist, isLoading: isLoadingWatchlist, error: watchlistError, handleSave: handleEditorSave, refetch: refetchWatchlist } = useEntityManager('/api/watchlist', 'WatchlistEntity', 'name')
  const { entities: suggestions, setEntities: setSuggestions, isLoading: isLoadingSuggestions, error: suggestionError, refetch: refetchSuggestions } = useEntityManager('/api/suggestions', 'WatchlistSuggestion', 'name', { dataKey: 'watchlistSuggestions' });

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [confirmState, setConfirmState] = useState({ isOpen: false, entityId: null })

  const availableCountries = useMemo(() => {
    if (!watchlist) return []
    const countrySet = new Set(watchlist.map((item) => item.country).filter(Boolean))
    return Array.from(countrySet).sort()
  }, [watchlist])

  const handleEdit = (id) => { setSelectedId(id); setIsEditorOpen(true); }
  const handleAdd = () => { setSelectedId('new'); setIsEditorOpen(true); }

  const handleSuggestionAction = async (suggestion, action) => {
    const toastId = toast.loading(`Processing suggestion "${suggestion.name}"...`)
    const result = await processWatchlistSuggestion({ suggestionId: suggestion._id, action, })
    if (result.success) {
      if (action === 'approved') refetchWatchlist();
      refetchSuggestions();
      toast.success(result.message, { id: toastId });
    } else {
      toast.error(`Failed to ${action} suggestion: ${result.error}`, { id: toastId });
    }
  }

  const handleSuggestionUpdate = useCallback(async (suggestion, updateData) => {
      setSuggestions(prev => prev.map(s => s._id === suggestion._id ? { ...s, ...updateData } : s));
      const result = await updateWatchlistSuggestion_local(suggestion._id, updateData);
      if (!result.success) {
          toast.error(`Update failed: ${result.error}`);
          refetchSuggestions();
      }
  }, [setSuggestions, refetchSuggestions]);

  const handleRowUpdate = useCallback(async (entity, updateData) => {
      let updatedEntity = { ...entity, ...updateData };
      if (updateData.searchTerms) updatedEntity.hitCount = 'recalculating';
      setWatchlist((prev) => prev.map((e) => (e._id === entity._id ? updatedEntity : e)));
      if (updateData.status) toast.success(`Updated "${updatedEntity.name}" status to ${updatedEntity.status}.`);
      const result = await updateWatchlistEntity(entity._id, updateData);
      if (result.success) {
        setWatchlist((prev) => prev.map((e) => (e._id === result.data._id ? result.data : e)));
      } else {
        toast.error(`Update failed: ${result.error}`);
        refetchWatchlist();
      }
    }, [watchlist, setWatchlist, refetchWatchlist]
  );

  const handleDelete = (entityId) => { setConfirmState({ isOpen: true, entityId }); }
  const confirmDelete = async () => {
    const { entityId } = confirmState;
    setConfirmState({ isOpen: false, entityId: null });
    const toastId = toast.loading('Deleting entity...');
    const result = await deleteWatchlistEntity(entityId);
    if (result.success) {
      toast.success('Entity deleted.', { id: toastId });
      refetchWatchlist();
    } else {
      toast.error(`Deletion failed: ${result.error}`, { id: toastId });
    }
  }

  const activeEntityData = useMemo(() => {
    if (selectedId === 'new') return { _id: null, name: '', type: 'company', status: 'candidate', context: '', country: '', estimatedNetWorthUSD_MM: null, primaryCompany: '', notes: '', searchTerms: [] };
    return watchlist?.find((e) => e._id === selectedId) || null
  }, [selectedId, watchlist])
  
  const error = watchlistError || suggestionError
  const isLoading = isLoadingWatchlist || isLoadingSuggestions

  if (error) {
    return ( <div className="flex h-full w-full items-center justify-center text-center p-4"> <div className="p-8 rounded-lg bg-destructive/10 border border-destructive/50 max-w-md"> <ServerCrash className="w-12 h-12 mx-auto text-destructive mb-4" /> <h1 className="text-2xl font-bold">Failed to Load Data</h1> <p className="text-destructive-foreground/80 mt-2">{error}</p> </div> </div> )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Watchlist Management" description="Manage entities monitored by the pipeline and review AI-generated suggestions." >
        <Button onClick={handleAdd}> <PlusCircle className="mr-2 h-4 w-4" /> Add New Entity </Button>
      </PageHeader>
      <div className="mt-8 flex-grow min-h-0">
        <Tabs defaultValue="watchlist" className="h-full flex flex-col">
          <TabsList>
            <TabsTrigger value="watchlist"> Monitored Entities ({watchlist?.length || 0}) </TabsTrigger>
            <TabsTrigger value="suggestions"> AI Suggestions ({suggestions?.length || 0}) </TabsTrigger>
          </TabsList>
          <TabsContent value="watchlist" className="flex-grow min-h-0">
            <DataTable columns={watchlistColumns(handleEdit, handleRowUpdate, handleDelete, availableCountries)} data={watchlist || []} isLoading={isLoading} filterColumn="name" filterPlaceholder="Filter by name..." secondaryFilterColumn="country" secondaryFilterOptions={availableCountries} />
          </TabsContent>
          <TabsContent value="suggestions" className="flex-grow min-h-0">
            <DataTable columns={suggestionColumns(handleSuggestionAction, handleSuggestionUpdate)} data={suggestions || []} isLoading={isLoading} filterColumn="name" filterPlaceholder="Filter by name..." />
          </TabsContent>
        </Tabs>
      </div>
      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        {/* DEFINITIVE FIX: The SheetContent component must have a single direct child. */}
        <SheetContent className="w-full sm:max-w-lg p-0">
          <WatchlistEditor key={selectedId} entity={activeEntityData} onSave={(saved) => { handleEditorSave(saved); setIsEditorOpen(false); }} onCancel={() => setIsEditorOpen(false)} countries={availableCountries} />
        </SheetContent>
      </Sheet>
      <ConfirmationDialog open={confirmState.isOpen} onOpenChange={(isOpen) => setConfirmState({ ...confirmState, isOpen })} onConfirm={confirmDelete} title="Confirm Deletion" description="Are you sure you want to delete this entity? This action cannot be undone." confirmText="Delete Entity" />
    </div>
  )
}
