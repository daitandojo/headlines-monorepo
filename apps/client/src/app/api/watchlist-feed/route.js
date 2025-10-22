// apps/client/src/app/api/watchlist-feed/route.js
import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { Subscriber, Article, SynthesizedEvent } from '@headlines/models/next'

const ITEMS_PER_PAGE = 20

const handleGet = async (request, { user }) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const skip = (page - 1) * ITEMS_PER_PAGE

  const subscriber = await Subscriber.findById(user.userId)
    .select('watchlistEntities')
    .lean()
  const watchlistEntityIds = subscriber?.watchlistEntities || []

  if (watchlistEntityIds.length === 0) {
    return NextResponse.json({ data: [], total: 0 })
  }

  const baseQuery = { watchlistHits: { $in: watchlistEntityIds } }

  const [articles, events, totalArticles, totalEvents] = await Promise.all([
    Article.find(baseQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(ITEMS_PER_PAGE)
      .lean(),
    SynthesizedEvent.find(baseQuery)
      .populate({ path: 'relatedOpportunities', select: '_id reachOutTo' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(ITEMS_PER_PAGE)
      .lean(),
    Article.countDocuments(baseQuery),
    SynthesizedEvent.countDocuments(baseQuery),
  ])

  // Add a _type field to distinguish items on the frontend
  const typedArticles = articles.map((item) => ({ ...item, _type: 'article' }))
  const typedEvents = events.map((item) => ({ ...item, _type: 'event' }))

  // Combine and sort all items by date
  const combinedFeed = [...typedArticles, ...typedEvents].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )

  const total = totalArticles + totalEvents

  return NextResponse.json({ data: combinedFeed, total })
}

export const GET = createApiHandler(handleGet)
export const dynamic = 'force-dynamic'
