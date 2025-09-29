'use server'

import dbConnect from '@headlines/data-access/dbConnect/node'
import { SynthesizedEvent, Article, Opportunity } from '@headlines/models'
import { buildQuery } from '../queryBuilder.js'
import mongoose from 'mongoose'

const EVENTS_PER_PAGE = 50

export async function getEvents({
  page = 1,
  filters = {},
  sort = 'createdAt_desc',
  userId = null,
}) {
  await dbConnect() // <-- ADD THIS BACK
  const { queryFilter, sortOptions } = await buildQuery(SynthesizedEvent, {
    filters,
    sort,
    userId,
  })
  const skipAmount = (page - 1) * EVENTS_PER_PAGE

  const [events, total] = await Promise.all([
    SynthesizedEvent.find(queryFilter)
      .select('-synthesized_summary')
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(EVENTS_PER_PAGE)
      .lean(),
    SynthesizedEvent.countDocuments(queryFilter),
  ])
  return { success: true, data: JSON.parse(JSON.stringify(events)), total }
}

export async function getEventDetails(eventId) {
  await dbConnect() // <-- ADD THIS BACK
  if (!mongoose.Types.ObjectId.isValid(eventId))
    return { success: false, error: 'Invalid event ID' }
  const event = await SynthesizedEvent.findById(eventId)
    .populate({ path: 'relatedOpportunities', model: Opportunity, select: 'reachOutTo' })
    .lean()
  if (!event) return { success: false, error: 'Event not found' }
  return { success: true, data: JSON.parse(JSON.stringify(event)) }
}

export async function updateEvent(eventId, updateData) {
  await dbConnect() // <-- ADD THIS BACK
  if (!mongoose.Types.ObjectId.isValid(eventId))
    return { success: false, error: 'Invalid event ID' }
  const event = await SynthesizedEvent.findByIdAndUpdate(
    eventId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean()
  if (!event) return { success: false, error: 'Event not found.' }
  return { success: true, data: JSON.parse(JSON.stringify(event)) }
}

export async function deleteEvent(eventId) {
  await dbConnect() // <-- ADD THIS BACK
  if (!mongoose.Types.ObjectId.isValid(eventId))
    return { success: false, error: 'Invalid event ID' }
  const result = await SynthesizedEvent.findByIdAndDelete(eventId)
  if (!result) return { success: false, error: 'Event not found.' }
  await Promise.all([
    Opportunity.updateMany({ events: eventId }, { $pull: { events: eventId } }),
    Article.updateMany(
      { synthesizedEventId: eventId },
      { $unset: { synthesizedEventId: '' } }
    ),
  ])
  return { success: true }
}
