// Full Path: headlines/src/app/(client)/events/page.js
import { DataView } from '@/components/client/DataView'
import { getEvents, getGlobalCountries } from '@headlines/data-access'
import { getUserIdFromSession } from '@/lib/auth/server'
import { cookies } from 'next/headers'

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'relevance_desc', icon: 'relevance', tooltip: 'Sort by Relevance' },
]

export default async function EventsPage({ searchParams }) {
  const userId = await getUserIdFromSession()

  // Read the client's filter state from the cookie on the server
  const cookieStore = cookies()
  const zustandCookie = cookieStore.get('headlines-app-storage')
  let serverSideCountryFilter = null
  if (zustandCookie?.value) {
    try {
      const parsedCookie = JSON.parse(zustandCookie.value)
      const globalFilter = parsedCookie?.state?.globalCountryFilter
      if (Array.isArray(globalFilter) && globalFilter.length > 0) {
        serverSideCountryFilter = globalFilter.join(',')
      }
    } catch (e) {
      console.error('Failed to parse Zustand cookie for server-side filter', e)
    }
  }

  const filters = {
    category: searchParams.category,
    country: serverSideCountryFilter, // Use the cookie value for the initial fetch
  }

  const [eventsResult, allCountriesResult] = await Promise.all([
    getEvents({ page: 1, filters, sort: searchParams.sort, userId }).catch((err) => ({
      success: false,
      data: [],
    })),
    getGlobalCountries().catch((err) => ({ success: false, data: [] })),
  ])

  const initialEvents = eventsResult.success ? eventsResult.data : []
  const countriesWithEvents = (allCountriesResult.data || []).filter((c) => c.count > 0)

  return (
    <DataView
      viewTitle="Synthesized Events"
      sortOptions={sortOptions}
      queryKeyPrefix="events"
      listComponentKey="event-list"
      initialData={initialEvents}
      filters={filters}
      allCountries={countriesWithEvents}
    />
  )
}
