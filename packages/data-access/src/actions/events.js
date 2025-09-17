// packages/data-access/src/actions/events.js (version 2.3.0)
'use server'

import dbConnect from '../dbConnect.js'
import mongoose from 'mongoose'
import { SynthesizedEvent, Subscriber } from '../../../models/src/index.js'
import { revalidatePath } from '../revalidate.js'
import { buildQuery } from '../queryBuilder.js'
import { getUserIdFromSession } from '../../../auth/src/index.js'

const EVENTS_PER_PAGE = 5

export async function deleteEvent({ itemId, userId }) {
  if (!itemId || !userId)
    return { success: false, message: 'Event ID and user ID are required.' }
  try {
    await dbConnect()
    await Subscriber.updateOne(
      { _id: userId },
      { $addToSet: { 'discardedItems.events': itemId } }
    )
    await revalidatePath('/')
    return { success: true, message: 'Event discarded.' }
  } catch (error) {
    return { success: false, message: `Failed to discard event: ${error.message}` }
  }
}

const baseQuery = { highest_relevance_score: { $gt: 25 } }

export async function getEvents({
  page = 1,
  filters = {},
  sort = 'date_desc',
  userId: explicitUserId = null,
}) {
  const sessionUserId = await getUserIdFromSession()
  const userId = explicitUserId || sessionUserId
  await dbConnect()
  const { queryFilter, sortOptions } = await buildQuery(SynthesizedEvent, {
    filters,
    sort,
    baseQuery,
    userId,
  })
  const skipAmount = (page - 1) * EVENTS_PER_PAGE
  const events = await SynthesizedEvent.find(queryFilter)
    .sort(sortOptions)
    .skip(skipAmount)
    .limit(EVENTS_PER_PAGE)
    .lean()
  return JSON.parse(JSON.stringify(events))
}

export async function getTotalEventCount({
  filters = {},
  userId: explicitUserId = null,
} = {}) {
  const sessionUserId = await getUserIdFromSession()
  const userId = explicitUserId || sessionUserId
  await dbConnect()
  const { queryFilter } = await buildQuery(SynthesizedEvent, {
    filters,
    baseQuery,
    userId,
  })
  return await SynthesizedEvent.countDocuments(queryFilter)
}
