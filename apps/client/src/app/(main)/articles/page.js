// src/app/(main)/articles/page.js (version 9.1)
import { DataView } from '@/components/DataView'
import { getArticles } from '@/actions/articles' // <-- Import getArticles
import { ArticleListWrapper } from '@/components/ArticleListWrapper'

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'relevance_desc', icon: 'relevance', tooltip: 'Sort by Relevance' },
]

export default async function ArticlesPage() {
  // Re-instated server-side fetch for initial data
  const initialArticles = await getArticles({ page: 1 })

  return (
    <DataView
      viewTitle="Raw Articles"
      baseSubtitle="articles"
      sortOptions={sortOptions}
      queryKeyPrefix="articles"
      ListComponent={ArticleListWrapper}
      initialData={initialArticles} // <-- Pass initial data as a prop
    />
  )
}
