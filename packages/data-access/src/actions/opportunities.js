// packages/data-access/src/actions/opportunities.js (version 2.3.0)
'use server'

import dbConnect from '../dbConnect.js'
import { Opportunity, Subscriber } from '../../../models/src/index.js'
import { revalidatePath } from '../revalidate.js'
import { buildQuery } from '../queryBuilder.js'
import { getUserIdFromSession } from '../../../auth/src/index.js'
import mongoose from 'mongoose'

const OPPORTUNITIES_PER_PAGE = 10

export async function deleteOpportunity({ itemId, userId }) {
  if (!itemId || !userId) return { success: false, message: 'ID and user ID are required.' }
  try {
    await dbConnect()
    await Subscriber.updateOne(
      { _id: userId },
      { $addToSet: { 'discardedItems.opportunities': itemId } }
    )
    await revalidatePath('/opportunities')
    return { success: true, message: 'Opportunity discarded.' }
  } catch (error) {
    return { success: false, message: 'Failed to discard opportunity.' }
  }
}


export async function getOpportunities({ page = 1, filters = {}, sort = 'date_desc', userId: explicitUserId = null }) {
  const sessionUserId = await getUserIdFromSession();
  const userId = explicitUserId || sessionUserId;
  await dbConnect()
  const { queryFilter, sortOptions } = await buildQuery(Opportunity, {
    filters,
    sort,
    userId,
  })
  const skipAmount = (page - 1) * OPPORTUNITIES_PER_PAGE

  const opportunities = await Opportunity.find(queryFilter)
    .populate({
      path: 'events',
      select:
        'synthesized_headline synthesized_summary source_articles highest_relevance_score',
      options: { limit: 1, sort: { createdAt: -1 } },
    })
    .sort(sortOptions)
    .skip(skipAmount)
    .limit(OPPORTUNITIES_PER_PAGE)
    .lean()

  const processed = opportunities.map((opp) => ({
    ...opp,
    sourceEventId: opp.events?.[0] || null,
  }))
  return JSON.parse(JSON.stringify(processed))
}

export async function getTotalOpportunitiesCount({ filters = {}, userId: explicitUserId = null } = {}) {
  const sessionUserId = await getUserIdFromSession();
  const userId = explicitUserId || sessionUserId;
  await dbConnect()
  const { queryFilter } = await buildQuery(Opportunity, { filters, userId })
  return await Opportunity.countDocuments(queryFilter)
}

export async function getOpportunityDetails(opportunityId) {
  if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
    return { success: false, error: 'Invalid ID format.' }
  }
  try {
    await dbConnect()
    const opportunity = await Opportunity.findById(opportunityId)
      .populate({
        path: 'events',
        options: { sort: { createdAt: -1 } },
      })
      .lean()

    if (!opportunity) {
      return { success: false, error: 'Opportunity not found.' }
    }

    return { success: true, data: JSON.parse(JSON.stringify(opportunity)) }
  } catch (error) {
    return { success: false, error: 'Database error while fetching opportunity details.' }
  }
}

export async function getUniqueOpportunityCountries() {
  const sessionUserId = await getUserIdFromSession();
  const userId = sessionUserId;
  await dbConnect();
  const { queryFilter } = await buildQuery(Opportunity, { userId });
  const countries = await Opportunity.distinct('basedIn', { ...queryFilter, basedIn: { $ne: null, $ne: '' } });
  return JSON.parse(JSON.stringify(countries.sort()));
}
