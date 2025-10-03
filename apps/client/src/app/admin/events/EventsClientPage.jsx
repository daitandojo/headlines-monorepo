// apps/client/src/app/admin/events/EventsClientPage.jsx
'use client'

import { useState, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  PageHeader,
  Accordion,
  Button,
  ConfirmationDialog,
  ExportButton,
} from '@/components/shared'
import { EventListItem, ListHeader } from './columns'
import { handleExport } from '@/lib/api-client'
import { deleteEventAction, updateEventAction, getEventDetailsAction } from './actions'

export default function EventsClientPage({ initialEvents, total }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = parseInt(searchParams.get('page') || '1', 10)
  const sortParam = searchParams.get('sort') || ''

  const [events, setEvents] = useState(initialEvents)
  const [sorting, setSorting] = useState(
    sortParam
      ? [{ id: sortParam.split('_')[0], desc: sortParam.split('_')[1] === 'desc' }]
      : []
  )
  const [expandedItemId, setExpandedItemId] = useState(null)
  const [confirmState, setConfirmState] = useState({ isOpen: false, eventId: null })

  const updateUrlParams = useCallback(
    ({ page, sorting }) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', page.toString())
      if (sorting?.length > 0) {
        params.set('sort', `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}`)
      } else {
        params.delete('sort')
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const handlePageChange = (newPage) => updateUrlParams({ page: newPage, sorting })
  const handleSortChange = (newSorting) =>
    updateUrlParams({ page: 1, sorting: newSorting })

  const handleFetchDetails = useCallback(async (eventId) => {
    const result = await getEventDetailsAction(eventId)
    if (result.success) {
      setEvents((currentData) =>
        currentData.map((e) => (e._id === eventId ? { ...e, details: result.data } : e))
      )
    } else {
      toast.error('Failed to load event details', { description: result.error })
    }
  }, [])

  const handleUpdate = useCallback(async (event, updateData) => {
    setEvents((currentData) =>
      currentData.map((e) =>
        e._id === event._id
          ? { ...e, ...updateData, details: { ...e.details, ...updateData } }
          : e
      )
    )
    toast.promise(updateEventAction(event._id, updateData), {
      loading: 'Updating event...',
      success: 'Event updated.',
      error: (err) => `Update failed: ${err.message}`,
    })
  }, [])

  const handleDelete = (eventId) => setConfirmState({ isOpen: true, eventId })

  const confirmDelete = useCallback(async () => {
    const { eventId } = confirmState
    setConfirmState({ isOpen: false, eventId: null })
    toast.promise(deleteEventAction(eventId), {
      loading: 'Deleting event...',
      success: 'Event deleted.',
      error: (err) => `Deletion failed: ${err.message}`,
    })
  }, [confirmState])

  const onExport = (fileType) => {
    const sort = sorting[0]
      ? `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}`
      : null
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
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            variant="outline"
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground mx-2">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => handlePageChange(page + 1)}
            variant="outline"
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
        <div className="relative rounded-md border flex-grow overflow-y-auto">
          <ListHeader sorting={sorting} setSorting={handleSortChange} />
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
