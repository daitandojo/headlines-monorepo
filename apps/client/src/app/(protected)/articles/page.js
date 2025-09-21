// apps/client/src/app/(protected)/articles/page.js (NEW FILE)
import { DataView } from '@/components/DataView'
import { getArticles } from '@headlines/data-access'

export const dynamic = 'force-dynamic'

const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
  { value: 'relevance_desc', icon: 'relevance', tooltip: 'Sort by Relevance' },
]

export default async function ArticlesPage() {
  let initialArticles = []
  try {
    const articles = await getArticles({ page: 1 })
    initialArticles = articles
  } catch (err) {
    console.error(
      '[ArticlesPage Build] Exception fetching initial articles:',
      err.message
    )
  }

  return (
    <DataView
      viewTitle="Raw Articles"
      baseSubtitle="articles"
      sortOptions={sortOptions}
      queryKeyPrefix="articles"
      listComponentKey="article-list"
      initialData={initialArticles}
    />
  )
}
