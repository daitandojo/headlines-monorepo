// apps/client/src/app/api/opportunities/route.js (NEW FILE)
import { NextResponse } from 'next/server'
import { getOpportunities, getTotalOpportunitiesCount } from '@headlines/data-access'
import { getUserIdFromSession } from '@shared/auth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const sort = searchParams.get('sort') || 'date_desc'
  const filters = {
    q: searchParams.get('q') || '',
    country: searchParams.get('country') || '',
    withEmail: searchParams.get('withEmail') === 'true',
    favoritesOnly: searchParams.get('favorites') === 'true',
  }

  const userId = await getUserIdFromSession()
  if (!userId)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const [oppsResult, totalResult] = await Promise.all([
      getOpportunities({ page, filters, sort, userId }),
      getTotalOpportunitiesCount({ filters, userId }),
    ])

    if (!oppsResult.success || !totalResult.success) {
      throw new Error(
        oppsResult.error || totalResult.error || 'Failed to fetch opportunity data'
      )
    }

    return NextResponse.json({ data: oppsResult.data, total: totalResult.total })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 })
  }
}
