// apps/client/src/app/api/articles/route.js (version 2.0.0)
import { NextResponse } from 'next/server'
import { getArticles, getTotalArticleCount } from '@headlines/data-access'
import { getUserIdFromSession } from '@shared/auth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const sort = searchParams.get('sort') || 'date_desc'
  const q = searchParams.get('q') || ''

  const userId = await getUserIdFromSession()
  if (!userId)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const [articlesResult, totalResult] = await Promise.all([
      getArticles({ page, filters: { q }, sort, userId }),
      getTotalArticleCount({ filters: { q }, userId }),
    ])

    if (!articlesResult.success || !totalResult.success) {
      throw new Error(
        articlesResult.error || totalResult.error || 'Failed to fetch article data'
      )
    }

    return NextResponse.json({ data: articlesResult.data, total: totalResult.total })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}
