// apps/client/src/app/(main)/opportunities/page.js (version 21.2.0 - Server Directive Fix)

// DEFINITIVE FIX: The "'use server'" directive is removed.
// This file is a Server Component by default, which can call server actions.
// Removing the directive allows it to also export the 'metadata' object.

import { DataView } from '@/components/DataView'
import { getOpportunities, getGlobalCountries } from '@headlines/data-access'
import { getUserIdFromSession } from '@headlines/auth'
import { cookies } from 'next/headers'

export const metadata = {
  title: 'Opportunities | Headlines',
  description: 'Manage and track wealth management opportunities.',
}

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'size_desc', icon: 'size', tooltip: 'Sort by Estimated Size' },
]

export default async function OpportunitiesPage({ searchParams }) {
  const userId = await getUserIdFromSession()

  const cookieStore = cookies()
  const zustandCookie = cookieStore.get('headlines-ui-storage')
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
    country: serverSideCountryFilter || searchParams.country,
    withEmail: searchParams.withEmail === 'true',
  }

  const [initialOpportunities, allCountriesResult] = await Promise.all([
    getOpportunities({ page: 1, filters, sort: searchParams.sort, userId }).catch(
      (err) => {
        console.error('[OpportunitiesPage] Failed to fetch initial opportunities:', err)
        return []
      }
    ),
    getGlobalCountries().catch((err) => {
      console.error('[OpportunitiesPage] Failed to fetch global countries:', err)
      return { data: [] }
    }),
  ])

  const countriesWithEvents = (allCountriesResult.data || []).filter(
    (country) => country.count > 0
  )

  return (
    <div>
      <DataView
        viewTitle="Actionable Opportunities"
        baseSubtitle="opportunities"
        sortOptions={sortOptions}
        queryKeyPrefix="opportunities"
        listComponentKey="opportunity-list"
        initialData={initialOpportunities}
        filters={filters}
        allCountries={countriesWithEvents}
      />
    </div>
  )
}
