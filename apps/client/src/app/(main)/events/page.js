// apps/client/src/app/(main)/events/page.js (version 16.1.0)
'use server'

import { DataView } from '@/components/DataView'
import { getEvents, getGlobalCountries } from '@headlines/data-access'
import { getUserIdFromSession } from '@headlines/auth'
import { cookies } from 'next/headers'

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'relevance_desc', icon: 'relevance', tooltip: 'Sort by Relevance' },
]

export default async function EventsPage({ searchParams }) {
  const userId = await getUserIdFromSession();

  const cookieStore = cookies();
  const zustandCookie = cookieStore.get('headlines-ui-storage');
  let serverSideCountryFilter = null;
  if (zustandCookie?.value) {
      try {
          const parsedCookie = JSON.parse(zustandCookie.value);
          const globalFilter = parsedCookie?.state?.globalCountryFilter;
          if (Array.isArray(globalFilter) && globalFilter.length > 0) {
              serverSideCountryFilter = globalFilter.join(',');
          }
      } catch (e) {
          console.error("Failed to parse Zustand cookie for server-side filter", e);
      }
  }

  const filters = {
    // DEFINITIVE FIX: Use direct property access for server component searchParams.
    category: searchParams.category,
    country: serverSideCountryFilter || searchParams.country,
  }

  const [initialEvents, allCountriesResult] = await Promise.all([
    getEvents({ page: 1, filters, sort: searchParams.sort, userId }).catch((err) => {
      console.error('[EventsPage] Failed to fetch initial events:', err)
      return []
    }),
    getGlobalCountries().catch((err) => {
      console.error('[EventsPage] Failed to fetch global countries:', err)
      return { data: [] }
    }),
  ])

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
