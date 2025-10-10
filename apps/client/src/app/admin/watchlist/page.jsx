// apps/client/src/app/admin/watchlist/page.jsx
import dbConnect from '@headlines/data-access/dbConnect/next'
import {
  getAllWatchlistEntities,
  getSuggestions,
  getAllCountries,
} from '@headlines/data-access/next'
import WatchlistClientPage from './WatchlistClientPage'
import { parseAdminListParams } from '@/lib/utils/parse-admin-list-params' // Import the new helper

export const dynamic = 'force-dynamic'

export default async function WatchlistPage({ searchParams }) {
  await dbConnect()

  // Use the helper to parse search params, making the component cleaner
  const { page, sort, filters } = parseAdminListParams(searchParams, 'name')

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
    return <div>Error loading data.</div>
  }

  const allCountries = countriesResult.data
    .filter((c) => c.status === 'active')
    .map((c) => c.name)

  return (
    <div className="flex flex-col h-full">
      <WatchlistClientPage
        initialWatchlist={JSON.parse(JSON.stringify(watchlistResult.data))}
        total={watchlistResult.total}
        initialSuggestions={JSON.parse(
          JSON.stringify(suggestionsResult.data.watchlistSuggestions)
        )}
        availableCountries={allCountries}
      />
    </div>
  )
}
