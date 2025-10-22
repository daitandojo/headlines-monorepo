// apps/client/src/app/(client)/my-watchlist/page.js
import { DataView } from '@/components/client/shared/DataView'
import { fetchServerSideData } from '@/lib/data/fetchServerSideData'

export const dynamic = 'force-dynamic'

// The watchlist has a simpler sort, primarily by date.
const sortOptions = [
  { value: 'date_desc', icon: 'clock', tooltip: 'Sort by Date (Newest First)' },
]

export default async function WatchlistPage({ searchParams }) {
  const { q, sort = 'date_desc' } = searchParams

  // Fetch from a new, dedicated API route for the watchlist feed.
  const { data: initialFeedItems } = await fetchServerSideData('/api/watchlist-feed', {
    page: '1',
    sort,
    q,
  })

  return (
    <DataView
      viewTitle="My Watchlist Feed"
      sortOptions={sortOptions}
      queryKeyPrefix="watchlist-feed"
      listComponentKey="watchlist-feed" // Use a new key for our mixed component
      initialData={initialFeedItems}
    />
  )
}