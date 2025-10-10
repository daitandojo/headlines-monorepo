// apps/client/src/app/(client)/events/page.js
import { DataView } from '@/components/client/shared/DataView'
import { fetchServerSideData } from '@/lib/data/fetchServerSideData' // Import the new helper

export const dynamic = 'force-dynamic'

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'relevance_desc', icon: 'relevance', tooltip: 'Sort by Relevance' },
]

export default async function EventsPage({ searchParams }) {
  const { q, sort = 'date_desc' } = searchParams

  const { data: initialEvents } = await fetchServerSideData('/api/events', {
    page: '1',
    sort,
    q,
  })

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
