// src/app/(main)/events/page.js (version 9.1)
import { DataView } from '@/components/DataView'
import { getEvents } from '@/actions/events' // <-- Import getEvents
import { EventListWrapper } from '@/components/EventListWrapper'

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'relevance_desc', icon: 'relevance', tooltip: 'Sort by Relevance' },
]

export default async function EventsPage() {
  // Re-instated server-side fetch for initial data
  const initialEvents = await getEvents({ page: 1 })

  return (
    <DataView
      viewTitle="Synthesized Events"
      baseSubtitle="events"
      sortOptions={sortOptions}
      queryKeyPrefix="events"
      ListComponent={EventListWrapper}
      initialData={initialEvents} // <-- Pass initial data as a prop
    />
  )
}
