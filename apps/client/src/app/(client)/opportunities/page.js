// apps/client/src/app/(client)/opportunities/page.js
import { DataView } from '@/components/client/shared/DataView'
import { fetchServerSideData } from '@/lib/data/fetchServerSideData'

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'size_desc', icon: 'size', tooltip: 'Sort by Estimated Size' },
]

export default async function OpportunitiesPage({ searchParams }) {
  const { q, sort = 'date_desc', withEmail, country } = searchParams // ADDED: country

  const { data: initialOpportunities } = await fetchServerSideData('/api/opportunities', {
    page: '1',
    sort,
    q,
    withEmail,
    country, // ADDED: pass country to fetcher
  })

  return (
    <DataView
      viewTitle="Actionable Opportunities"
      sortOptions={sortOptions}
      queryKeyPrefix="opportunities"
      listComponentKey="opportunity-list"
      initialData={initialOpportunities}
    />
  )
}
