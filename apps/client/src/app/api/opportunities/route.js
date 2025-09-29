import { NextResponse } from 'next/server'
import { getOpportunities, getTotalOpportunitiesCount } from '@headlines/data-access'
import { createClientApiHandler } from '@/lib/api-handler' // Use the new client handler

const handleGet = async (request, { user }) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const sort = searchParams.get('sort') || 'date_desc'
  const filters = {
    q: searchParams.get('q') || '',
    country: searchParams.get('country') || '',
    withEmail: searchParams.get('withEmail') === 'true',
    favoritesOnly: searchParams.get('favorites') === 'true',
  }

  const [oppsResult, totalResult] = await Promise.all([
    getOpportunities({ page, filters, sort, userId: user.userId }),
    getTotalOpportunitiesCount({ filters, userId: user.userId }),
  ])

  if (!oppsResult.success || !totalResult.success) {
    throw new Error(
      oppsResult.error || totalResult.error || 'Failed to fetch opportunity data'
    )
  }

  return NextResponse.json({ data: oppsResult.data, total: totalResult.total })
}

export const GET = createClientApiHandler(handleGet)
export const dynamic = 'force-dynamic'
