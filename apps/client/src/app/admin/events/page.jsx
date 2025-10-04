// apps/client/src/app/admin/events/page.jsx (MODIFIED)
import { getEvents, getDistinctCountries } from '@headlines/data-access/next'
import EventsClientPage from './EventsClientPage'

export const dynamic = 'force-dynamic'

export default async function EventsPage({ searchParams }) {
  const page = parseInt(searchParams.page || '1', 10)
  const sort = searchParams.sort || null
  const filters = {}

  // ACTION: Fetch both events and the list of available countries concurrently.
  const [eventsResult, countriesResult] = await Promise.all([
    getEvents({ page, filters, sort }),
    getDistinctCountries(),
  ])

  return (
    <EventsClientPage
      initialEvents={eventsResult.success ? eventsResult.data : []}
      total={eventsResult.success ? eventsResult.total : 0}
      availableCountries={countriesResult.success ? countriesResult.data : []}
    />
  )
}
