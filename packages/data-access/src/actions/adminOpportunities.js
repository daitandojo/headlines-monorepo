// packages/data-access/src/actions/adminOpportunities.js (version 1.0.0)
'use server'

import dbConnect from '../dbConnect.js'
import { Opportunity } from '../../../models/src/index.js'
import { buildQuery } from '../queryBuilder.js'
import { verifyAdmin } from '../../../auth/src/index.js'
import { revalidatePath } from '../revalidate.js'

export async function getAdminOpportunities({
  page = 1,
  filters = {},
  sort = 'date_desc',
}) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error, data: [], total: 0 }

  await dbConnect()
  const { queryFilter, sortOptions } = await buildQuery(Opportunity, {
    filters,
    sort,
    baseQuery: {},
  })

  const [opportunities, total] = await Promise.all([
    Opportunity.find(queryFilter)
      .populate({ path: 'events', select: 'synthesized_headline', options: { limit: 1 } })
      .sort(sortOptions)
      .lean(),
    Opportunity.countDocuments(queryFilter),
  ])

  return { success: true, data: JSON.parse(JSON.stringify(opportunities)), total }
}

export async function updateAdminOpportunity(oppId, updateData) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }
  try {
    await dbConnect()
    const opp = await Opportunity.findByIdAndUpdate(
      oppId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean()
    if (!opp) return { success: false, error: 'Opportunity not found.' }
    await revalidatePath('/admin/opportunities')
    return { success: true, data: JSON.parse(JSON.stringify(opp)) }
  } catch (e) {
    // DEFINITIVE FIX: Check for MongoDB duplicate key error (E11000)
    // and return a user-friendly message.
    if (e.code === 11000) {
      return { success: false, error: 'An opportunity with this name already exists.' }
    }
    return { success: false, error: 'Failed to update opportunity.' }
  }
}

export async function deleteAdminOpportunity(oppId) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }
  try {
    await dbConnect()
    const result = await Opportunity.findByIdAndDelete(oppId)
    if (!result) return { success: false, error: 'Opportunity not found.' }
    await revalidatePath('/admin/opportunities')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to delete opportunity.' }
  }
}
