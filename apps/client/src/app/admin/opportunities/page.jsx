// apps/client/src/app/admin/opportunities/page.jsx
import { getOpportunities } from '@headlines/data-access'
import OpportunitiesClientPage from './OpportunitiesClientPage' // New client component
import dbConnect from '@headlines/data-access/dbConnect/next'

export const dynamic = 'force-dynamic'

export default async function OpportunitiesPage({ searchParams }) {
  await dbConnect()
  const page = parseInt(searchParams.page || '1', 10)
  const sort = searchParams.sort || null
  const columnFilters = searchParams.filters ? JSON.parse(searchParams.filters) : []

  const filters = columnFilters.reduce((acc, filter) => {
    if (filter.value) {
      const key = filter.id === 'reachOutTo' ? 'q' : filter.id
      acc[key] = filter.value
    }
    return acc
  }, {})

  const result = await getOpportunities({ page, filters, sort })

  return (
    <OpportunitiesClientPage
      initialOpportunities={result.success ? result.data : []}
      total={result.success ? result.total : 0}
    />
  )
}
