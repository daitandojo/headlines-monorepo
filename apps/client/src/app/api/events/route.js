// apps/client/src/app/api/events/route.js
import { NextResponse } from 'next/server'
import { getEvents, getTotalEventCount } from '@headlines/data-access/next'
import { createApiHandler } from '@/lib/api-handler' // Use the new single handler

// This is the handler for GET requests to /api/events
const handleGet = async (request, { user }) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const sort = searchParams.get('sort') || 'date_desc'
  const filters = {
    q: searchParams.get('q') || '',
    country: searchParams.get('country') || '',
    favoritesOnly: searchParams.get('favorites') === 'true',
  }

  // The user object is passed in from our createApiHandler wrapper
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

// We wrap our handler. The default for createApiHandler is requireAdmin: false, which is correct here.
export const GET = createApiHandler(handleGet)
export const dynamic = 'force-dynamic'
