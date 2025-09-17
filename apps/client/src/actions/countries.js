// src/actions/countries.js (version 1.1)
'use server'

import dbConnect from '@/lib/mongodb'
import Article from '@/models/Article'
import SynthesizedEvent from '@/models/SynthesizedEvent'
import Opportunity from '@/models/Opportunity'

/**
 * Gets a comprehensive list of all unique countries across all collections,
 * sorted by the number of articles associated with them.
 * @returns {Promise<Array<{name: string, count: number}>>} A promise that resolves to the sorted list of countries.
 */
export async function getGlobalCountries() {
  await dbConnect()
  console.log('[getGlobalCountries] Fetching and processing country data...')

  // 1. Get article counts for sorting (primary sorting metric)
  const articleCounts = await Article.aggregate([
    { $match: { country: { $ne: null, $ne: '' } } },
    { $group: { _id: '$country', count: { $sum: 1 } } },
    { $project: { name: '$_id', count: 1, _id: 0 } },
  ])

  // 2. Get distinct countries from all relevant collections to ensure none are missed
  const [eventCountries, opportunityCountries] = await Promise.all([
    SynthesizedEvent.distinct('country', { country: { $ne: null, $ne: '' } }),
    Opportunity.distinct('basedIn', { basedIn: { $ne: null, $ne: '' } }),
  ])

  // 3. Clean and merge all country names
  const allCountries = new Set(articleCounts.map((c) => c.name))
  ;[...eventCountries, ...opportunityCountries].forEach((rawCountry) => {
    // START: ADDED GUARD CLAUSE TO PREVENT CRASH
    // This check handles any unexpected null or undefined values from the DB.
    if (rawCountry) {
      const cleaned = rawCountry.split('(')[0].trim()
      if (cleaned) allCountries.add(cleaned)
    }
    // END: ADDED GUARD CLAUSE
  })

  // 4. Create a final map and sort
  const countryMap = new Map(articleCounts.map((c) => [c.name, c.count]))
  const finalCountryList = Array.from(allCountries).map((name) => ({
    name,
    count: countryMap.get(name) || 0,
  }))

  finalCountryList.sort((a, b) => b.count - a.count)

  console.log(
    `[getGlobalCountries] Processed ${finalCountryList.length} unique countries.`
  )
  return finalCountryList
}
