// sourcePack.txt updated in apps/client/src/app/admin/articles/page.js

import ArticlesClientPage from './ArticlesClientPage'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function ArticlesPage({ searchParams }) {
  const page = parseInt(searchParams.page || '1', 10)
  const sort = searchParams.sort || null
  const columnFilters = searchParams.filters ? JSON.parse(searchParams.filters) : []

  const filters = columnFilters.reduce((acc, filter) => {
    if (filter.value) {
      const key = filter.id === 'headline' ? 'q' : filter.id
      acc[key] = filter.value
    }
    return acc
  }, {})

  let initialArticles = []
  let total = 0

  try {
    // ✅ Fetch through API route
    const url = new URL(
      '/api/admin/articles',
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    )
    url.searchParams.set('page', page.toString())
    if (sort) url.searchParams.set('sort', sort)
    if (Object.keys(filters).length > 0) {
      url.searchParams.set('filters', JSON.stringify(filters))
    }

    const response = await fetch(url.toString(), {
      headers: {
        cookie: cookies().toString(), // Forward cookies for auth
      },
    })

    if (response.ok) {
      const result = await response.json()
      initialArticles = result.data || []
      total = result.total || 0
    }
  } catch (err) {
    console.error('[AdminArticlesPage] Failed to fetch articles:', err.message)
  }

  return <ArticlesClientPage initialArticles={initialArticles} total={total} />
}
