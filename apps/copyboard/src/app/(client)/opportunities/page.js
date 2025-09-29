// File: apps/copyboard/src/app/(client)/opportunities/page.js

// 'use server'

import { DataView } from '@/components/client/DataView'
import { getOpportunities } from '@headlines/data-access/next'
import { getUserIdFromSession } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'size_desc', icon: 'size', tooltip: 'Sort by Estimated Size' },
]

export default async function OpportunitiesPage({ searchParams }) {
  const userId = await getUserIdFromSession()
  let initialOpportunities = []

  if (userId) {
    try {
      const filters = {
        q: searchParams.q || '',
        withEmail: searchParams.withEmail === 'true',
      }
      const sort = searchParams.sort || 'date_desc'

      const result = await getOpportunities({ page: 1, filters, sort, userId })
      if (result.success) {
        initialOpportunities = result.data
      }
    } catch (err) {
      console.error('[OpportunitiesPage] Failed to fetch initial data:', err.message)
    }
  }

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
