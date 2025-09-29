// Full Path: headlines/src/app/(client)/opportunities/page.js
import { DataView } from '@/components/client/DataView'
import { getOpportunities, getGlobalCountries } from '@headlines/data-access'
import { getUserIdFromSession } from '@/lib/auth/server'
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
    country: serverSideCountryFilter, // Use the cookie value for the initial fetch
    withEmail: searchParams.withEmail === 'true',
  }

  const [oppsResult, allCountriesResult] = await Promise.all([
    getOpportunities({ page: 1, filters, sort: searchParams.sort, userId }).catch(
      (err) => ({ success: false, data: [] })
    ),
    getGlobalCountries().catch((err) => ({ success: false, data: [] })),
  ])

  const initialOpportunities = oppsResult.success ? oppsResult.data : []
  const countriesWithEvents = (allCountriesResult.data || []).filter((c) => c.count > 0)

  return (
    <div>
      <DataView
        viewTitle="Actionable Opportunities"
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
