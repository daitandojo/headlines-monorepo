'use server'

import { PageHeader, Button } from '@/components/shared'
import dbConnect from '@headlines/data-access/dbConnect.js'
import {
  getAllWatchlistEntities,
  getSuggestions,
  getAllCountries,
} from '@headlines/data-access'
import WatchlistClientPage from './WatchlistClientPage' // We will create this next
import { PlusCircle } from 'lucide-react'
import { languageList } from '@headlines/utils-shared'

export default async function WatchlistPage() {
  await dbConnect()

  const [watchlistResult, suggestionsResult, countriesResult] = await Promise.all([
    getAllWatchlistEntities(),
    getSuggestions(),
    getAllCountries(),
  ])

  // Error handling can be improved, but this is a start
  if (
    !watchlistResult.success ||
    !suggestionsResult.success ||
    !countriesResult.success
  ) {
    return (
      <div>
        <h1>Error loading data</h1>
        <p>{watchlistResult.error || suggestionsResult.error || countriesResult.error}</p>
      </div>
    )
  }

  const allCountries = countriesResult.data
    .filter((c) => c.status === 'active')
    .map((c) => c.name)

  return (
    <div className="flex flex-col h-full">
      <WatchlistClientPage
        initialWatchlist={JSON.parse(JSON.stringify(watchlistResult.data))}
        initialSuggestions={JSON.parse(
          JSON.stringify(suggestionsResult.data.watchlistSuggestions)
        )}
        availableCountries={allCountries}
      />
    </div>
  )
}
