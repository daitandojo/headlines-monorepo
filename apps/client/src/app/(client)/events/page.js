// apps/client/src/app/(client)/events/page.js
import { DataView } from '@/components/client/shared/DataView'
import { getEvents } from '@headlines/data-access'
import { getUserIdFromSession } from '@/lib/auth/server'
import dbConnect from '@headlines/data-access/dbConnect/next'

export const dynamic = 'force-dynamic'

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'relevance_desc', icon: 'relevance', tooltip: 'Sort by Relevance' },
]

export default async function EventsPage({ searchParams }) {
  await dbConnect()
  const userId = await getUserIdFromSession()
  let initialEvents = []

  // NO REDIRECT HERE.
  // If userId is null, we simply fetch no data. The AuthProvider on the client
  // will handle redirecting the user away from this page.
  if (userId) {
    try {
      const filters = { q: searchParams.q || '' }
      const sort = searchParams.sort || sortOptions[0].value

      const result = await getEvents({ page: 1, userId, filters, sort })
      if (result.success) {
        initialEvents = result.data
      }
    } catch (err) {
      console.error('[EventsPage] Failed to fetch initial events:', err.message)
    }
  }

  return (
    <DataView
      viewTitle="Synthesized Events"
      initialData={initialEvents}
      listComponentKey="event-list"
      queryKeyPrefix="events"
      sortOptions={sortOptions}
    />
  )
}
