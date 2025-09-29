'use client'

import {
  PageHeader,
  Accordion,
  LoadingOverlay,
  Button,
  ConfirmationDialog,
  ExportButton,
} from '@/components/shared'
import { EventListItem, ListHeader } from './columns'
import { useEntityManager } from '@/hooks/use-entity-manager'
import { toast } from 'sonner'
import { useCallback, useState } from 'react'
import { handleExport } from '@/lib/api-client'
import { deleteEventAction, updateEventAction, getEventDetailsAction } from './actions'

export default function EventsPage() {
  const {
    data: events,
    setData,
    total,
    isLoading,
    refetch,
    page,
    setPage,
    sorting,
    setSorting,
  } = useEntityManager('events')

  const [expandedItemId, setExpandedItemId] = useState(null)
  const [confirmState, setConfirmState] = useState({ isOpen: false, eventId: null })

  const handleFetchDetails = useCallback(
    async (eventId) => {
      const result = await getEventDetailsAction(eventId)
      if (result.success) {
        setData((currentData) =>
          currentData.map((e) => (e._id === eventId ? { ...e, details: result.data } : e))
        )
      } else {
        toast.error('Failed to load event details', { description: result.error })
      }
    },
    [setData]
  )

  const handleUpdate = useCallback(
    async (event, updateData) => {
      setData((currentData) =>
        currentData.map((e) =>
          e._id === event._id
            ? { ...e, ...updateData, details: { ...e.details, ...updateData } }
            : e
        )
      )
      const result = await updateEventAction(event._id, updateData)
      if (!result.success) {
        toast.error(`Update failed: ${result.error}`)
        refetch()
      } else {
        toast.success('Event updated successfully.')
      }
    },
    [setData, refetch]
  )

  const handleDelete = (eventId) => setConfirmState({ isOpen: true, eventId })

  const confirmDelete = useCallback(async () => {
    const { eventId } = confirmState
    setConfirmState({ isOpen: false, eventId: null })
    const toastId = toast.loading('Deleting event...')
    const result = await deleteEventAction(eventId)
    if (result.success) {
      toast.success('Event deleted.', { id: toastId })
      refetch()
    } else {
      toast.error(`Deletion failed: ${result.error}`, { id: toastId })
    }
  }, [confirmState, refetch])

  const onExport = (fileType) => {
    const sort = sorting[0]
      ? `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}`
      : null
    // The custom list view for events doesn't support columnFilters from the header, so we pass an empty array.
    return handleExport('events', fileType, [], sort)
  }

  const description = `Review, audit, and manage all ${total.toLocaleString()} synthesized events.`
  const totalPages = Math.ceil(total / 50) || 1

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Event Management" description={description}>
        <ExportButton hasData={events && events.length > 0} onExport={onExport} />
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
          <LoadingOverlay isLoading={isLoading && events.length === 0} />
          <ListHeader sorting={sorting} setSorting={setSorting} />
          <Accordion
            type="single"
            collapsible
            value={expandedItemId}
            onValueChange={setExpandedItemId}
          >
            {events.map((event) => (
              <EventListItem
                key={event._id}
                event={event}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                isExpanded={expandedItemId === event._id}
                onDetailsNeeded={handleFetchDetails}
              />
            ))}
          </Accordion>
        </div>
      </div>
      <ConfirmationDialog
        open={confirmState.isOpen}
        onOpenChange={(isOpen) => setConfirmState({ ...confirmState, isOpen })}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        description="Are you sure you want to permanently delete this event and its related data?"
        confirmText="Delete Event"
      />
    </div>
  )
}
