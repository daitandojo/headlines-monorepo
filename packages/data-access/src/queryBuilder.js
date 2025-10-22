// packages/data-access/src/queryBuilder.js
import { Subscriber } from '@headlines/models'

export async function buildQuery(
  model,
  { filters = {}, sort = 'date_desc', baseQuery = {}, userId = null }
) {
  const andConditions = [{ ...baseQuery }]
  let user = null

  if (userId) {
    user = await Subscriber.findById(userId)
      .select('discardedItems favoritedItems countries sectors role')
      .lean()
  }

  const countryField = model.schema.paths.basedIn ? 'basedIn' : 'country'

  if (user) {
    // --- START OF FIX ---
    // The previous logic incorrectly applied the `filters.country` parameter
    // even for admin users. The correct behavior is for admins to bypass
    // all user-facing country subscription filters and see all data by default.
    if (user.role === 'admin') {
      // Admin users should see all countries, so we add no country-based conditions.
      // We only apply a country filter if it's explicitly passed, which might be
      // useful for specific admin panel searches, but for the main client view,
      // the expectation is to see everything. By leaving this block mostly empty,
      // we ensure admins are not constrained by the global country selector.
      if (filters.country) {
        // This part is now intentionally commented out for the main client view.
        // If you need admin-specific filtering elsewhere, you would add a new flag.
        // andConditions.push({ [countryField]: { $in: filters.country.split(',') } });
      }
    } else {
      // This is the correct logic for regular users.
      const subscribedCountries = (user.countries || [])
        .filter((c) => c.active)
        .flatMap((c) => c.name.split(',')) // Split comma-separated strings
        .map((name) => name.trim()) // Trim whitespace
        .filter(Boolean) // Remove empty strings

      const uniqueSubscribedCountries = [...new Set(subscribedCountries)]

      if (uniqueSubscribedCountries.length > 0) {
        andConditions.push({ [countryField]: { $in: uniqueSubscribedCountries } })
      } else {
        andConditions.push({ [countryField]: { $in: [] } }) // See nothing if no countries are subscribed
      }
    }
    // --- END OF FIX ---

    // Sector filtering logic for the logged-in user.
    if (user.role !== 'admin' && user.sectors && user.sectors.length > 0) {
      const sectorRegexes = user.sectors.map((sector) => new RegExp(`^${sector}$`, 'i'))
      const sectorOrConditions = []
      if (model.schema.paths.tags) {
        sectorOrConditions.push({ tags: { $in: sectorRegexes } })
      }
      if (model.schema.paths['transactionDetails.transactionType']) {
        sectorOrConditions.push({
          'transactionDetails.transactionType': { $in: sectorRegexes },
        })
      }
      if (sectorOrConditions.length > 0) {
        andConditions.push({ $or: sectorOrConditions })
      }
    }

    // Discarded items filtering logic (unchanged)
    if (user?.discardedItems) {
      const modelName = model.modelName.toLowerCase()
      const discardedIds = user.discardedItems[`${modelName}s`]
      if (discardedIds && discardedIds.length > 0) {
        andConditions.push({ _id: { $nin: discardedIds } })
      }
    }
  } else if (filters.country) {
    andConditions.push({ [countryField]: { $in: filters.country.split(',') } })
  }

  // Search, category, and other filters (unchanged)
  if (filters.q) {
    const searchRegex = { $regex: filters.q, $options: 'i' }
    const orConditions = [
      { headline: searchRegex },
      { synthesized_headline: searchRegex },
      { reachOutTo: searchRegex },
    ].filter((cond) => model.schema.paths[Object.keys(cond)[0]])
    if (orConditions.length > 0) andConditions.push({ $or: orConditions })
  }

  if (filters.category) {
    const categories = filters.category.split(',').filter(Boolean)
    if (categories.length > 0) {
      const categoryOrConditions = categories.flatMap((category) => [
        { eventClassification: category },
        { 'transactionDetails.transactionType': category },
      ])
      andConditions.push({ $or: categoryOrConditions })
    }
  }

  if (filters.withEmail)
    andConditions.push({ 'contactDetails.email': { $exists: true, $ne: null, $ne: '' } })

  if (user?.favoritedItems && filters.favoritesOnly) {
    const modelName = model.modelName.toLowerCase()
    const favoritedIds = user.favoritedItems[`${modelName}s`] || []
    andConditions.push({ _id: { $in: favoritedIds } })
  }

  const queryFilter =
    andConditions.length > 1 ? { $and: andConditions } : andConditions[0] || {}

  // Sorting logic (unchanged)
  const sortOptions = {}
  if (sort) {
    let [key, direction] = sort.split('_')
    const sortKeyMap = {
      date: 'createdAt',
      relevance: 'highest_relevance_score',
      size: 'lastKnownEventLiquidityMM',
    }
    key = sortKeyMap[key] || key
    if (key && direction) sortOptions[key] = direction === 'desc' ? -1 : 1
    else sortOptions.createdAt = -1
  } else {
    sortOptions.createdAt = -1
  }

  return { queryFilter, sortOptions }
}
