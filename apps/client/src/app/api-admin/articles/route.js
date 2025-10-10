// sourcePack.txt created file apps/client/src/app/api-admin/articles/route.js

import { NextResponse } from 'next/server'
import { getArticles, getTotalArticleCount } from '@headlines/data-access/next'
import { createApiHandler } from '@/lib/api-handler'

const handleGet = async (request) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const sort = searchParams.get('sort') || 'createdAt_desc'
  const filtersJSON = searchParams.get('filters')
  const filters = filtersJSON ? JSON.parse(filtersJSON) : {}

  const [articlesResult, totalResult] = await Promise.all([
    getArticles({ page, filters, sort }),
    getTotalArticleCount({ filters }),
  ])

  if (!articlesResult.success || !totalResult.success) {
    throw new Error(
      articlesResult.error || totalResult.error || 'Failed to fetch articles'
    )
  }

  return NextResponse.json({ data: articlesResult.data, total: totalResult.total })
}

export const GET = createApiHandler(handleGet)
export const dynamic = 'force-dynamic'
