// apps/client/src/app/(main)/articles/page.js (version 11.0.0)
'use server'

import { DataView } from '@/components/DataView'
import { getArticles } from '@headlines/data-access'

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'relevance_desc', icon: 'relevance', tooltip: 'Sort by Relevance' },
]

export default async function ArticlesPage() {
  const initialArticles = await getArticles({ page: 1 }).catch((err) => {
    console.error('[ArticlesPage] Failed to fetch initial articles:', err)
    // DEFINITIVE FIX: Return an empty array on failure, which is the correct type for initialData.
    return []
  })

  return (
    <DataView
      viewTitle="Raw Articles"
      baseSubtitle="articles"
      sortOptions={sortOptions}
      queryKeyPrefix="articles"
      listComponentKey="article-list"
      // DEFINITIVE FIX: Pass the initialArticles array directly, not a non-existent .data property.
      initialData={initialArticles}
    />
  )
}
