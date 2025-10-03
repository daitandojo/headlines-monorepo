// apps/client/src/app/api/events/route.js
import { NextResponse } from 'next/server'
import { getEvents, getTotalEventCount } from '@headlines/data-access'
import { createClientApiHandler } from '@/lib/api-handler'

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

  // The user object is passed in from our createClientApiHandler wrapper
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

// We wrap our handler with the authentication and error handling middleware
export const GET = createClientApiHandler(handleGet)
export const dynamic = 'force-dynamic'
