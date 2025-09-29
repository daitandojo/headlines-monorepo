// apps/client/src/app/api/events/route.js (NEW FILE)
import { NextResponse } from 'next/server'
import { getEvents, getTotalEventCount } from '@headlines/data-access'
import { getUserIdFromSession } from '@shared/auth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const sort = searchParams.get('sort') || 'date_desc'
  const filters = {
    q: searchParams.get('q') || '',
    country: searchParams.get('country') || '',
    category: searchParams.get('category') || '',
    favoritesOnly: searchParams.get('favorites') === 'true',
  }

  const userId = await getUserIdFromSession()
  if (!userId)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const [eventsResult, totalResult] = await Promise.all([
      getEvents({ page, filters, sort, userId }),
      getTotalEventCount({ filters, userId }),
    ])

    if (!eventsResult.success || !totalResult.success) {
      throw new Error(
        eventsResult.error || totalResult.error || 'Failed to fetch event data'
      )
    }

    return NextResponse.json({ data: eventsResult.data, total: totalResult.total })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}
