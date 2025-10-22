// apps/client/src/app/api/events/route.js
import { NextResponse } from 'next/server'
import { getEvents, getTotalEventCount } from '@headlines/data-access/next'
import { createApiHandler } from '@/lib/api-handler'

const handleGet = async (request, { user }) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const sort = searchParams.get('sort') || 'date_desc'
  const filters = {
    q: searchParams.get('q') || '',
    country: searchParams.get('country') || '',
    favoritesOnly: searchParams.get('favorites') === 'true',
    category: searchParams.get('category') || '',
  }

  const [eventsResult, totalResult] = await Promise.all([
    getEvents({ page, filters, sort, userId: user.userId }),
    getTotalEventCount({ filters, userId: user.userId }),
  ])

  if (!eventsResult.success || !totalResult.success) {
    throw new Error(
      eventsResult.error || totalResult.error || 'Failed to fetch event data'
    )
  }

  return NextResponse.json({ data: eventsResult.data, total: totalResult.total })
}

export const GET = createApiHandler(handleGet)
export const dynamic = 'force-dynamic'
