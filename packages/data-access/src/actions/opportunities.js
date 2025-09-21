// packages/data-access/src/actions/opportunities.js (version 4.0.0 - Unified)
'use server'

import dbConnect from '../dbConnect.js'
import { Opportunity } from '../../../models/src/index.js'
import { buildQuery } from '../queryBuilder.js'
import { revalidatePath } from '../revalidate.js'
import mongoose from 'mongoose'

const OPPORTUNITIES_PER_PAGE = 50

export async function getOpportunities({
  page = 1,
  filters = {},
  sort = 'date_desc',
  userId = null,
}) {
  await dbConnect()
  const { queryFilter, sortOptions } = await buildQuery(Opportunity, {
    filters,
    sort,
    userId,
  })
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
  await revalidatePath('/admin/opportunities')
  return { success: true, data: JSON.parse(JSON.stringify(opp)) }
}

export async function deleteOpportunity(oppId) {
  await dbConnect()
  const result = await Opportunity.findByIdAndDelete(oppId)
  if (!result) return { success: false, error: 'Opportunity not found.' }
  await revalidatePath('/admin/opportunities')
  return { success: true }
}
