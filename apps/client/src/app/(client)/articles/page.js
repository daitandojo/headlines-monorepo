// apps/client/src/app/(client)/articles/page.js
import { DataView } from '@/components/client/shared/DataView'
import { fetchServerSideData } from '@/lib/data/fetchServerSideData' // Import the new helper

export const dynamic = 'force-dynamic'

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'relevance_desc', icon: 'relevance', tooltip: 'Sort by Relevance' },
]

export default async function ArticlesPage({ searchParams }) {
  const { q, sort = 'date_desc' } = searchParams

  // Use the helper to fetch data, encapsulating the try/catch and fetch logic.
  const { data: initialArticles } = await fetchServerSideData('/api/articles', {
    page: '1',
    sort,
    q,
  })

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
