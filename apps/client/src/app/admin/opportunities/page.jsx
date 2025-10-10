// apps/client/src/app/admin/opportunities/page.jsx
import OpportunitiesClientPage from './OpportunitiesClientPage'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function OpportunitiesPage({ searchParams }) {
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

  let initialOpportunities = []
  let total = 0

  try {
    // ✅ Fetch through the admin API route
    const url = new URL(
      '/api/admin/opportunities',
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    )
    url.searchParams.set('page', page.toString())
    if (sort) {
      url.searchParams.set('sort', sort)
    }
    // Pass filters as a JSON string
    if (Object.keys(filters).length > 0) {
      url.searchParams.set('filters', JSON.stringify(filters))
    }

    const response = await fetch(url.toString(), {
      headers: {
        cookie: cookies().toString(), // Forward cookies for admin auth
      },
    })

    if (response.ok) {
      const result = await response.json()
      initialOpportunities = result.data || []
      total = result.total || 0
    } else {
      console.error(
        '[Admin/OpportunitiesPage] API responded with an error:',
        response.status
      )
    }
  } catch (err) {
    console.error('[Admin/OpportunitiesPage] Failed to fetch opportunities:', err.message)
  }

  return (
    <OpportunitiesClientPage initialOpportunities={initialOpportunities} total={total} />
  )
}
