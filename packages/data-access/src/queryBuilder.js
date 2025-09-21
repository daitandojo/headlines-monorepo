// packages/data-access/src/queryBuilder.js (version 5.0.0)
import { Subscriber } from '../../models/src/index.js'

export async function buildQuery(
  model,
  { filters = {}, sort = 'date_desc', baseQuery = {}, userId = null }
) {
  const andConditions = [{ ...baseQuery }]
  const effectiveUserId = filters.userId || userId
  const user = effectiveUserId ? await Subscriber.findById(effectiveUserId).select('discardedItems favoritedItems countries filterPreferences role').lean() : null;
  const countryField = model.schema.paths.basedIn ? 'basedIn' : 'country';

  // --- DEFINITIVE HIERARCHICAL FILTERING LOGIC ---
  if (user) {
    // LAYER 1: The "Universe" of allowed countries. Admins have no limit.
    const allowedCountries = (user.role === 'admin') 
        ? null 
        : new Set((user.countries || []).filter(c => c.active).map(c => c.name));

    let desiredCountries = null;

    // LAYER 3: Temporary View Filter takes highest precedence.
    // The client sends a single country name for this.
    if (filters.country && !filters.country.includes(',')) {
        desiredCountries = new Set([filters.country]);
    } 
    // LAYER 2: Persistent Global Filter from DB is next.
    else if (user.filterPreferences?.globalCountryFilter?.length > 0) {
        desiredCountries = new Set(user.filterPreferences.globalCountryFilter);
    }
    // No filter is set, so we will fall back to all subscribed countries (Layer 1).

    let finalCountriesToQuery = [];

    if (allowedCountries) { // For regular users
        if (desiredCountries) {
            // Intersect desired filter (Layer 2 or 3) with allowed subscriptions (Layer 1).
            finalCountriesToQuery = [...allowedCountries].filter(c => desiredCountries.has(c));
        } else {
            // No filter specified, show all their subscribed countries.
            finalCountriesToQuery = [...allowedCountries];
        }
    } else { // For admins
        if (desiredCountries) {
            // Admin wants a filter, apply it.
            finalCountriesToQuery = [...desiredCountries];
        } 
        // Admin with no filter sees everything, so we add no country condition.
    }
    
    // Add the condition to the main query.
    if (finalCountriesToQuery.length > 0) {
        andConditions.push({ [countryField]: { $in: finalCountriesToQuery } });
    } else if (desiredCountries && finalCountriesToQuery.length === 0) {
        // A filter was desired, but it resulted in an empty set (e.g., filtered for unsubscribed country).
        // This query should return no results.
        andConditions.push({ [countryField]: { $in: [] } });
    }
    // If no filter is desired and they are an admin, no country condition is added.
  } else if (filters.country) {
      // Fallback for non-user contexts (e.g., initial pipeline run) that still might use a country filter
      andConditions.push({ [countryField]: { $in: filters.country.split(',') } });
  }

  // --- Other Filters ---
  if (filters.q) {
    const searchRegex = { $regex: filters.q, $options: 'i' }
    const textSearchablePaths = Object.keys(model.schema.paths).filter(p => model.schema.paths[p].instance === 'String')
    const orConditions = textSearchablePaths.map((path) => ({ [path]: searchRegex }))
    if (orConditions.length > 0) andConditions.push({ $or: orConditions })
  }

  if (filters.category) {
    andConditions.push({ eventClassification: filters.category })
  }

  if (filters.withEmail) {
    andConditions.push({ 'contactDetails.email': { $exists: true, $ne: null, $ne: '' } })
  }

  if (user?.favoritedItems && filters.favoritesOnly) {
    const modelName = model.modelName.toLowerCase()
    const favoritedIds = user.favoritedItems[`${modelName}s`] || []
    andConditions.push({ _id: { $in: favoritedIds } })
  }

  if (user?.discardedItems) {
    const modelName = model.modelName.toLowerCase()
    const discardedIds = user.discardedItems[`${modelName}s`]
    if (discardedIds && discardedIds.length > 0) {
      andConditions.push({ _id: { $nin: discardedIds } })
    }
  }

  const queryFilter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0] || {}

  const sortOptions = {}
  if (sort) {
    let [key, direction] = sort.split('_')
    const sortKeyMap = { date: 'createdAt', relevance: 'highest_relevance_score', size: 'likelyMMDollarWealth' };
    key = sortKeyMap[key] || key;
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
