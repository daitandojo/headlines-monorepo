// src/app/(main)/opportunities/page.js (version 14.1)
import { DataView } from '@/components/DataView'
import { getOpportunities } from '@/actions/opportunities' // <-- Import getOpportunities
import { OpportunityListWrapper } from '@/components/OpportunityListWrapper'

export const metadata = {
  title: 'Opportunities | Headlines',
  description: 'Manage and track wealth management opportunities.',
}

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'size_desc', icon: 'size', tooltip: 'Sort by Estimated Size' },
]

export default async function OpportunitiesPage() {
  // Re-instated server-side fetch for initial data
  const initialOpportunities = await getOpportunities({ page: 1 })

  return (
    <div className="max-w-5xl mx-auto w-full">
      <DataView
        viewTitle="Actionable Opportunities"
        baseSubtitle="opportunities"
        sortOptions={sortOptions}
        queryKeyPrefix="opportunities"
        ListComponent={OpportunityListWrapper}
        initialData={initialOpportunities} // <-- Pass initial data as a prop
      />
    </div>
  )
}
