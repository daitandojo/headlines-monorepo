// apps/client/src/app/(protected)/opportunities/page.js (NEW FILE)
import { DataView } from '@/components/DataView'
import { getOpportunities, getGlobalCountries } from '@headlines/data-access'
import { getUserIdFromSession } from '@headlines/auth'

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

  const filters = {
    withEmail: searchParams.withEmail === 'true',
  }

  const [oppsResult, allCountriesResult] = await Promise.all([
    getOpportunities({ page: 1, filters, sort: searchParams.sort, userId }).catch(
      (err) => {
        console.error('[OpportunitiesPage] Failed to fetch initial opportunities:', err)
        return []
      }
    ),
    getGlobalCountries().catch((err) => {
      console.error('[OpportunitiesPage] Failed to fetch global countries:', err)
      return []
    }),
  ])

  const initialOpportunities = oppsResult
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
