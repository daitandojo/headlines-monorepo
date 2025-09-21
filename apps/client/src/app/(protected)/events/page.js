// apps/client/src/app/(protected)/events/page.js (NEW FILE)
import { DataView } from '@/components/DataView'
import { getEvents, getGlobalCountries } from '@headlines/data-access'
import { getUserIdFromSession } from '@headlines/auth'

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'relevance_desc', icon: 'relevance', tooltip: 'Sort by Relevance' },
]

export default async function EventsPage({ searchParams }) {
  const userId = await getUserIdFromSession()

  const filters = {
    category: searchParams.category,
  }

  const [eventsResult, allCountriesResult] = await Promise.all([
    getEvents({ page: 1, filters, sort: searchParams.sort, userId }).catch((err) => {
      console.error('[EventsPage] Failed to fetch initial events:', err)
      return []
    }),
    getGlobalCountries().catch((err) => {
      console.error('[EventsPage] Failed to fetch global countries:', err)
      return []
    }),
  ])

  const initialEvents = eventsResult
  const countriesWithEvents = (allCountriesResult.data || []).filter(
    (country) => country.count > 0
  )

  return (
    <DataView
      viewTitle="Synthesized Events"
      baseSubtitle="events"
      sortOptions={sortOptions}
      queryKeyPrefix="events"
      listComponentKey="event-list"
      initialData={initialEvents}
      filters={filters}
      allCountries={countriesWithEvents}
    />
  )
}
