// File: packages/data-access/src/actions/opportunities.js (Corrected Sorting)

import dbConnect from '@headlines/data-access/dbConnect/node'
import { Opportunity } from '@headlines/models'
import { buildQuery } from '../queryBuilder.js'
import mongoose from 'mongoose'

const OPPORTUNITIES_PER_PAGE = 50

export async function getTotalOpportunitiesCount({ filters = {}, userId = null }) {
  await dbConnect()
  const { queryFilter } = await buildQuery(Opportunity, { filters, userId })
  const total = await Opportunity.countDocuments(queryFilter)
  return { success: true, total }
}

export async function getOpportunities({
  page = 1,
  filters = {},
  sort = 'date_desc',
  userId = null,
}) {
  await dbConnect()
  let { queryFilter, sortOptions } = await buildQuery(Opportunity, {
    filters,
    sort,
    userId,
  })

  // --- START: OPPORTUNITY-SPECIFIC SORTING FIX ---
  // If we are sorting by size, we MUST exclude documents where the
  // wealth is null, undefined, or 0, as they would otherwise sort first.
  if (sort === 'size_desc') {
    if (queryFilter.$and) {
      queryFilter.$and.push({ likelyMMDollarWealth: { $gt: 0 } })
    } else if (Object.keys(queryFilter).length > 0) {
      queryFilter = { $and: [queryFilter, { likelyMMDollarWealth: { $gt: 0 } }] }
    } else {
      queryFilter = { likelyMMDollarWealth: { $gt: 0 } }
    }
  }
  // --- END: OPPORTUNITY-SPECIFIC SORTING FIX ---

  const skipAmount = (page - 1) * OPPORTUNITIES_PER_PAGE
  const [opportunities, total] = await Promise.all([
    Opportunity.find(queryFilter)
      .populate({ path: 'events', select: 'synthesized_headline', options: { limit: 1 } })
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(OPPORTUNITIES_PER_PAGE)
      .lean(),
    Opportunity.countDocuments(queryFilter),
  ])
  return { success: true, data: JSON.parse(JSON.stringify(opportunities)), total }
}

export async function getOpportunityDetails(opportunityId) {
  if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
    return { success: false, error: 'Invalid ID format.' }
  }
  await dbConnect()
  const opportunity = await Opportunity.findById(opportunityId)
    .populate({ path: 'events', options: { sort: { createdAt: -1 } } })
    .lean()
  if (!opportunity) return { success: false, error: 'Opportunity not found.' }
  return { success: true, data: JSON.parse(JSON.stringify(opportunity)) }
}

export async function updateOpportunity(oppId, updateData) {
  await dbConnect()
  const opp = await Opportunity.findByIdAndUpdate(
    oppId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean()
  if (!opp) return { success: false, error: 'Opportunity not found.' }
  return { success: true, data: JSON.parse(JSON.stringify(opp)) }
}

export async function deleteOpportunity(oppId) {
  await dbConnect()
  const result = await Opportunity.findByIdAndDelete(oppId)
  if (!result) return { success: false, error: 'Opportunity not found.' }
  return { success: true }
}
