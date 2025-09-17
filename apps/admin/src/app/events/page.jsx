// apps/admin/src/app/events/page.jsx (version 2.2.0 - State Management Fix)
'use client'

import {
  PageHeader, Accordion, LoadingOverlay, Button, ExportButton,
} from '@headlines/ui'
import { EventListItem, ListHeader } from './columns'
import { useAdminManager } from '@/hooks/use-admin-manager'
import {
  deleteAdminEvent, updateAdminEvent, exportEventsToCSV, exportEventsToXLSX,
} from '@headlines/data-access'
import { toast } from 'sonner'
import { useCallback, useState } from 'react'

export default function EventsPage() {
  const [sorting, setSorting] = useState([{ id: 'createdAt', desc: true }])
  const [columnFilters, setColumnFilters] = useState([])
  const [page, setPage] = useState(1)
  const [expandedItemId, setExpandedItemId] = useState(null); // State for expanded item

  const { data, setData, total, isLoading, refetch } = useAdminManager(
    '/api/events', page, sorting, columnFilters
  )

  const handleOptimisticUpdate = useCallback(
    async (event, updateData) => {
      setData((currentData) =>
        currentData.map((e) => (e._id === event._id ? { ...e, ...updateData } : e))
      )
      if (Object.keys(updateData).length === 0) {
        // This is a refetch call from RelationshipManager
        setExpandedItemId(null); // Close and reopen to trigger refetch
        setTimeout(() => setExpandedItemId(event._id), 50);
        return;
      }
      const result = await updateAdminEvent(event._id, updateData)
      if (!result.success) {
        toast.error(`Update failed: ${result.error}`)
        refetch()
      }
    }, [setData, refetch]
  )

  const handleDelete = useCallback(
    async (eventId) => {
      setData((currentData) => currentData.filter((e) => e._id !== eventId))
      toast.success('Event and its relations deleted.')
      const result = await deleteAdminEvent(eventId)
      if (!result.success) {
        toast.error(`Deletion failed on server: ${result.error}. Reverting.`)
        refetch()
      }
    }, [setData, refetch]
  )
  
  const description = `Review, audit, and manage all ${data.length.toLocaleString()} visible events (${total.toLocaleString()} total).`
  const totalPages = Math.ceil(total / 50) || 1
  
  const currentFilters = columnFilters.reduce((acc, filter) => {
    acc[filter.id === 'synthesized_headline' ? 'q' : filter.id] = filter.value;
    return acc;
  }, {});
  const sortParam = sorting[0] ? `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}` : 'createdAt_desc';

  const exportActions = {
    csv: () => exportEventsToCSV({ filters: currentFilters, sort: sortParam }),
    xlsx: () => exportEventsToXLSX({ filters: currentFilters, sort: sortParam }),
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Event Management" description={description}>
        <ExportButton hasData={data && data.length > 0} filename="events_export" exportActions={exportActions} />
      </PageHeader>
      <div className="mt-8 flex-grow min-h-0 flex flex-col">
        <div className="flex items-center py-4 justify-end">
            <div className="flex items-center gap-2">
                <Button onClick={() => setPage((p) => Math.max(1, p - 1))} variant="outline" disabled={page <= 1}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button onClick={() => setPage((p) => p + 1)} variant="outline" disabled={page >= totalPages}>Next</Button>
            </div>
        </div>
        <div className="relative rounded-md border flex-grow overflow-y-auto">
          <LoadingOverlay isLoading={isLoading && !data?.length} />
          <ListHeader sorting={sorting} setSorting={setSorting} columnFilters={columnFilters} setColumnFilters={setColumnFilters} />
          <Accordion type="single" collapsible value={expandedItemId} onValueChange={setExpandedItemId}>
            {data.map((event) => (
              <EventListItem
                key={event._id}
                event={event}
                onUpdate={handleOptimisticUpdate}
                onDelete={handleDelete}
                isExpanded={expandedItemId === event._id}
              />
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  )
}
