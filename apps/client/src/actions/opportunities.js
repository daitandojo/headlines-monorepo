// src/actions/opportunities.js (version 10.1)
'use server'

import dbConnect from '@/lib/mongodb'
import Opportunity from '@/models/Opportunity'
import { revalidatePath } from 'next/cache'
import { OPPORTUNITIES_PER_PAGE } from '@/config/constants'
import { buildQuery } from '@/lib/queryBuilder'

export async function getOpportunities({ page = 1, filters = {}, sort = 'date_desc' }) {
  await dbConnect()
  const { queryFilter, sortOptions } = buildQuery(Opportunity, { filters, sort })
  const skipAmount = (page - 1) * OPPORTUNITIES_PER_PAGE

  const opportunities = await Opportunity.find(queryFilter)
    .populate('sourceArticleId', 'headline link newspaper')
    .populate(
      'sourceEventId',
      'synthesized_headline synthesized_summary source_articles highest_relevance_score'
    )
    .sort(sortOptions)
    .skip(skipAmount)
    .limit(OPPORTUNITIES_PER_PAGE)
    .lean()

  return JSON.parse(JSON.stringify(opportunities))
}

export async function getTotalOpportunitiesCount({ filters = {} } = {}) {
  await dbConnect()
  const { queryFilter } = buildQuery(Opportunity, { filters })
  const count = await Opportunity.countDocuments(queryFilter)
  return count
}

export async function deleteOpportunity(opportunityId) {
  if (!opportunityId) {
    return { success: false, message: 'Opportunity ID is required.' }
  }
  try {
    await dbConnect()
    const result = await Opportunity.findByIdAndDelete(opportunityId)
    if (!result) {
      return { success: false, message: 'Opportunity not found.' }
    }
    revalidatePath('/opportunities')
    return { success: true, message: 'Opportunity deleted successfully.' }
  } catch (error) {
    console.error('Delete Opportunity Error:', error)
    return { success: false, message: 'Failed to delete opportunity.' }
  }
}
