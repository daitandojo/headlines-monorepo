// apps/client/src/app/admin/watchlist/page.jsx
import {
  getAllWatchlistEntities,
  getSuggestions,
  getAllCountries,
} from '@headlines/data-access'
import WatchlistClientPage from './WatchlistClientPage'
import dbConnect from '@headlines/data-access/dbConnect/next'

export const dynamic = 'force-dynamic'

export default async function WatchlistPage({ searchParams }) {
  await dbConnect()
  const page = parseInt(searchParams.page || '1', 10)
  const sort = searchParams.sort || null
  const columnFilters = searchParams.filters ? JSON.parse(searchParams.filters) : []

  const filters = columnFilters.reduce((acc, filter) => {
    if (filter.value) {
      const key = filter.id === 'name' ? 'q' : filter.id
      acc[key] = filter.value
    }
    return acc
  }, {})

  const [watchlistResult, suggestionsResult, countriesResult] = await Promise.all([
    getAllWatchlistEntities({ page, filters, sort }),
    getSuggestions(),
    getAllCountries(),
  ])

  if (
    !watchlistResult.success ||
    !suggestionsResult.success ||
    !countriesResult.success
  ) {
    return <div>Error loading data.</div> // Simple error handling for brevity
  }

  const allCountries = countriesResult.data
    .filter((c) => c.status === 'active')
    .map((c) => c.name)

  return (
    <div className="flex flex-col h-full">
      <WatchlistClientPage
        initialWatchlist={JSON.parse(JSON.stringify(watchlistResult.data))}
        total={watchlistResult.total}
        initialSuggestions={JSON.parse(JSON.stringify(suggestionsResult.data.watchlistSuggestions))}
        availableCountries={allCountries}
      />
    </div>
  )
}
