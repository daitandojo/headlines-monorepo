// packages/data-access/src/core/opportunities.js
import { Opportunity } from '@headlines/models'
import { buildQuery } from '../queryBuilder.js'
import mongoose from 'mongoose'

const OPPORTUNITIES_PER_PAGE = 50

export async function getDistinctOpportunityFields(field) {
  try {
    const distinctValues = await Opportunity.distinct(field)
    return { success: true, data: distinctValues }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updateOpportunities(filter, update) {
  try {
    const result = await Opportunity.updateMany(filter, update)
    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getTotalOpportunitiesCount({ filters = {}, userId = null }) {
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
  let { queryFilter, sortOptions } = await buildQuery(Opportunity, {
    filters,
    sort,
    userId,
  })

  if (sort === 'size_desc') {
    if (queryFilter.$and) {
      queryFilter.$and.push({ likelyMMDollarWealth: { $gt: 0 } })
    } else if (Object.keys(queryFilter).length > 0) {
      queryFilter = { $and: [queryFilter, { likelyMMDollarWealth: { $gt: 0 } }] }
    } else {
      queryFilter = { likelyMMDollarWealth: { $gt: 0 } }
    }
  }

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
  const opportunity = await Opportunity.findById(opportunityId)
    .populate({ path: 'events', options: { sort: { createdAt: -1 } } })
    .lean()
  if (!opportunity) return { success: false, error: 'Opportunity not found.' }
  return { success: true, data: JSON.parse(JSON.stringify(opportunity)) }
}

export async function updateOpportunity(oppId, updateData) {
  const opp = await Opportunity.findByIdAndUpdate(
    oppId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean()
  if (!opp) return { success: false, error: 'Opportunity not found.' }
  return { success: true, data: JSON.parse(JSON.stringify(opp)) }
}

export async function deleteOpportunity(oppId) {
  const result = await Opportunity.findByIdAndDelete(oppId)
  if (!result) return { success: false, error: 'Opportunity not found.' }
  return { success: true }
}
