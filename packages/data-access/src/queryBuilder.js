import { Subscriber } from '@headlines/models'
import dbConnect from './dbConnect.js'

// --- START OF THE FIX ---
// The function MUST be marked as async.
export async function buildQuery(
  // --- END OF THE FIX ---
  model,
  { filters = {}, sort = 'date_desc', baseQuery = {}, userId = null }
) {
  // This dbConnect call is now crucial for robustness
  await dbConnect()

  const andConditions = [{ ...baseQuery }]
  let user = null

  if (userId) {
    user = await Subscriber.findById(userId)
      .select('discardedItems favoritedItems countries role')
      .lean()
  }

  const countryField = model.schema.paths.basedIn ? 'basedIn' : 'country'

  if (user) {
    if (user.role === 'admin') {
      if (filters.country) {
        andConditions.push({ [countryField]: { $in: filters.country.split(',') } })
      }
    } else {
      const subscribedCountries = (user.countries || [])
        .filter((c) => c.active)
        .map((c) => c.name)
      if (subscribedCountries.length > 0) {
        andConditions.push({ [countryField]: { $in: subscribedCountries } })
      } else {
        andConditions.push({ [countryField]: { $in: [] } }) // See nothing
      }
    }

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

  if (filters.q) {
    const searchRegex = { $regex: filters.q, $options: 'i' }
    const orConditions = [
      { headline: searchRegex },
      { synthesized_headline: searchRegex },
      { reachOutTo: searchRegex },
    ].filter((cond) => model.schema.paths[Object.keys(cond)[0]])

    if (orConditions.length > 0) andConditions.push({ $or: orConditions })
  }

  if (filters.category) andConditions.push({ eventClassification: filters.category })
  if (filters.withEmail)
    andConditions.push({ 'contactDetails.email': { $exists: true, $ne: null, $ne: '' } })

  if (user?.favoritedItems && filters.favoritesOnly) {
    const modelName = model.modelName.toLowerCase()
    const favoritedIds = user.favoritedItems[`${modelName}s`] || []
    andConditions.push({ _id: { $in: favoritedIds } })
  }

  const queryFilter =
    andConditions.length > 1 ? { $and: andConditions } : andConditions[0] || {}

  const sortOptions = {}
  if (sort) {
    let [key, direction] = sort.split('_')
    const sortKeyMap = {
      date: 'createdAt',
      relevance: 'highest_relevance_score',
      size: 'likelyMMDollarWealth',
    }
    key = sortKeyMap[key] || key
    if (key && direction) {
      sortOptions[key] = direction === 'desc' ? -1 : 1
    } else {
      sortOptions.createdAt = -1
    }
  } else {
    sortOptions.createdAt = -1
  }

  return { queryFilter, sortOptions }
}
