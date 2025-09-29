// File: apps/client/src/app/(client)/articles/page.js

// 'use server'

import { DataView } from '@/components/client/DataView'
import { getArticles } from '@headlines/data-access'
import { getUserIdFromSession } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'relevance_desc', icon: 'relevance', tooltip: 'Sort by Relevance' },
]

export default async function ArticlesPage({ searchParams }) {
  const userId = await getUserIdFromSession()
  let initialArticles = []

  if (userId) {
    try {
      const filters = { q: searchParams.q || '' }
      const sort = searchParams.sort || 'date_desc'

      const result = await getArticles({ page: 1, filters, sort, userId })
      if (result.success) {
        initialArticles = result.data
      }
    } catch (err) {
      console.error('[ArticlesPage] Failed to fetch initial data:', err.message)
    }
  }

  return (
    <DataView
      viewTitle="Raw Articles"
      sortOptions={sortOptions}
      queryKeyPrefix="articles"
      listComponentKey="article-list"
      initialData={initialArticles}
    />
  )
}
