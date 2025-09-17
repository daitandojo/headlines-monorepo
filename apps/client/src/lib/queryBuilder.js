// src/lib/queryBuilder.js (version 1.0)
'use server'

/**
 * Builds a MongoDB query filter and sort options object.
 * @param {object} model - The Mongoose model (used for schema inspection if needed).
 * @param {object} options - The options object.
 * @param {object} options.filters - The filter parameters from the client.
 * @param {string} options.sort - The sort parameter from the client.
 * @param {object} options.baseQuery - The base query conditions for the model.
 * @returns {{queryFilter: object, sortOptions: object}}
 */
export function buildQuery(model, { filters = {}, sort = 'date_desc', baseQuery = {} }) {
  const andConditions = [{ ...baseQuery }]

  // Text search condition
  if (filters.q) {
    const searchRegex = { $regex: filters.q, $options: 'i' }
    const schemaPaths = Object.keys(model.schema.paths)

    const searchFields = []
    if (schemaPaths.includes('headline')) searchFields.push({ headline: searchRegex })
    if (schemaPaths.includes('headline_en'))
      searchFields.push({ headline_en: searchRegex })
    if (schemaPaths.includes('assessment_article'))
      searchFields.push({ assessment_article: searchRegex })
    if (schemaPaths.includes('synthesized_headline'))
      searchFields.push({ synthesized_headline: searchRegex })
    if (schemaPaths.includes('synthesized_summary'))
      searchFields.push({ synthesized_summary: searchRegex })
    if (schemaPaths.includes('reachOutTo')) searchFields.push({ reachOutTo: searchRegex })
    if (schemaPaths.includes('whyContact')) searchFields.push({ whyContact: searchRegex })
    if (schemaPaths.includes('contactDetails.company'))
      searchFields.push({ 'contactDetails.company': searchRegex })
    if (schemaPaths.includes('key_individuals.name'))
      searchFields.push({ 'key_individuals.name': searchRegex })

    if (searchFields.length > 0) {
      andConditions.push({ $or: searchFields })
    }
  }

  // Country filter condition
  if (filters.country && filters.country.length > 0) {
    const countryField = model.schema.paths.basedIn ? 'basedIn' : 'country'
    andConditions.push({ [countryField]: { $in: filters.country } })
  }

  const queryFilter =
    andConditions.length > 1 ? { $and: andConditions } : andConditions[0] || {}

  // Sorting options
  const sortOptions = {}
  switch (sort) {
    case 'date_asc':
      sortOptions.createdAt = 1
      break
    case 'relevance_desc':
      if (model.schema.paths.relevance_article) {
        sortOptions.relevance_article = -1
      } else if (model.schema.paths.highest_relevance_score) {
        sortOptions.highest_relevance_score = -1
      }
      break
    case 'size_desc':
      if (model.schema.paths.likelyMMDollarWealth) {
        sortOptions.likelyMMDollarWealth = -1
      }
      break
    default:
      sortOptions.createdAt = -1
      break
  }

  return { queryFilter, sortOptions }
}
