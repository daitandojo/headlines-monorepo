import { NextResponse } from 'next/server'
import { getArticles, getTotalArticleCount } from '@headlines/data-access'
import { createClientApiHandler } from '@/lib/api-handler' // Use the new client handler

const handleGet = async (request, { user }) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const sort = searchParams.get('sort') || 'date_desc'
  const filters = {
    q: searchParams.get('q') || '',
  }

  // The user object from the handler contains the userId
  const [articlesResult, totalResult] = await Promise.all([
    getArticles({ page, filters, sort, userId: user.userId }),
    getTotalArticleCount({ filters, userId: user.userId }),
  ])

  if (!articlesResult.success || !totalResult.success) {
    throw new Error(
      articlesResult.error || totalResult.error || 'Failed to fetch article data'
    )
  }

  return NextResponse.json({ data: articlesResult.data, total: totalResult.total })
}

export const GET = createClientApiHandler(handleGet)
export const dynamic = 'force-dynamic'
