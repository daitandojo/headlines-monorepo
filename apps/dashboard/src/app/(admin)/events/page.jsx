// apps/admin/src/app/(protected)/events/page.jsx (version 4.0.1)
'use client'

import {
  PageHeader,
  Accordion,
  LoadingOverlay,
  Button,
  ExportButton,
} from '@components/shared'
import { EventListItem, ListHeader } from './columns'
import { useEntityManager } from '@/hooks/use-entity-manager'
import { toast } from 'sonner'
import { useCallback, useState } from 'react'
import { deleteEvent, updateEvent } from '@/lib/api-client'
import { exportEventsToCSV, exportEventsToXLSX } from '@headlines/data-access'
import { API_EVENTS, QUERY_KEY_EVENTS } from '@/lib/constants'

export default function EventsPage() {
  const {
    data,
    setData,
    total,
    isLoading,
    refetch,
    page,
    setPage,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  } = useEntityManager(API_EVENTS, QUERY_KEY_EVENTS, [{ id: 'createdAt', desc: true }])

  const [expandedItemId, setExpandedItemId] = useState(null)

  const handleUpdate = useCallback(
    async (event, updateData) => {
      if (Object.keys(updateData).length === 0) {
        refetch()
        return
      }
      setData((currentData) =>
        currentData.map((e) => (e._id === event._id ? { ...e, ...updateData } : e))
      )
      const result = await updateEvent(event._id, updateData)
      if (result.error) {
        toast.error(`Update failed: ${result.error}`)
        refetch()
      }
    },
    [setData, refetch]
  )

  const handleDelete = useCallback(
    async (eventId) => {
      const originalData = [...data]
      setData((currentData) => currentData.filter((e) => e._id !== eventId))
      const result = await deleteEvent(eventId)
      if (result.error) {
        toast.error(`Deletion failed: ${result.error}. Reverting.`)
        setData(originalData)
      } else {
        toast.success('Event deleted.')
        refetch()
      }
    },
    [data, setData, refetch]
  )

  const description = `Review, audit, and manage all ${total.toLocaleString()} synthesized events.`
  const totalPages = Math.ceil(total / 50) || 1
  const sortParam = sorting[0]
    ? `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}`
    : 'createdAt_desc'
  const exportActions = {
    csv: () => exportEventsToCSV({ filters: columnFilters, sort: sortParam }),
    xlsx: () => exportEventsToXLSX({ filters: columnFilters, sort: sortParam }),
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Event Management" description={description}>
        <ExportButton
          hasData={data && data.length > 0}
          filename="events_export"
          exportActions={exportActions}
        />
      </PageHeader>
      <div className="mt-8 flex-grow min-h-0 flex flex-col">
        <div className="flex items-center py-4 justify-end">
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            variant="outline"
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground mx-2">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage((p) => p + 1)}
            variant="outline"
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
        <div className="relative rounded-md border flex-grow overflow-y-auto">
          <LoadingOverlay isLoading={isLoading && !data?.length} />
          <ListHeader
            sorting={sorting}
            setSorting={setSorting}
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
          />
          <Accordion
            type="single"
            collapsible
            value={expandedItemId}
            onValueChange={setExpandedItemId}
          >
            {data.map((event) => (
              <EventListItem
                key={event._id}
                event={event}
                onUpdate={handleUpdate}
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
