// src/actions/events.js (version 5.1)
'use server'

import dbConnect from '@/lib/mongodb'
import mongoose from 'mongoose'
import SynthesizedEvent from '@/models/SynthesizedEvent'
import Opportunity from '@/models/Opportunity'
import Article from '@/models/Article'
import { revalidatePath } from 'next/cache'
import { EVENTS_PER_PAGE } from '@/config/constants'
import { buildQuery } from '@/lib/queryBuilder'

export async function getEventDeletionImpact(eventId) {
  if (!eventId) {
    return { success: false, message: 'Event ID is required.' }
  }
  try {
    await dbConnect()
    const event = await SynthesizedEvent.findById(eventId).lean()
    if (!event) return { success: false, message: 'Event not found.' }

    const opportunities = await Opportunity.find({ sourceEventId: eventId }).lean()
    const opportunityCount = opportunities.length

    const sourceArticleLinks = event.source_articles.map((a) => a.link)
    const relatedArticles = await Article.find({ link: { $in: sourceArticleLinks } })
      .select('_id')
      .lean()
    const articleIds = relatedArticles.map((a) => a._id.toString())

    return { success: true, opportunityCount, articleIds }
  } catch (error) {
    console.error('Get Deletion Impact Error:', error)
    return { success: false, message: 'Failed to calculate deletion impact.' }
  }
}

export async function deleteEvent({
  eventId,
  deleteOpportunities = false,
  deleteArticleIds = [],
}) {
  if (!eventId) {
    return { success: false, message: 'Event ID is required.' }
  }
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    await dbConnect()
    let deletedOpps = 0
    let deletedArticles = 0

    if (deleteOpportunities) {
      const oppResult = await Opportunity.deleteMany(
        { sourceEventId: eventId },
        { session }
      )
      deletedOpps = oppResult.deletedCount
    }

    if (deleteArticleIds && deleteArticleIds.length > 0) {
      const articleResult = await Article.deleteMany(
        { _id: { $in: deleteArticleIds } },
        { session }
      )
      deletedArticles = articleResult.deletedCount
    }

    const eventResult = await SynthesizedEvent.findByIdAndDelete(eventId, { session })
    if (!eventResult) {
      throw new Error('Synthesized event not found.')
    }

    await session.commitTransaction()
    revalidatePath('/')
    revalidatePath('/opportunities')
    revalidatePath('/articles')

    let message = `Event deleted successfully.`
    if (deletedOpps > 0) message += ` ${deletedOpps} opportunities removed.`
    if (deletedArticles > 0) message += ` ${deletedArticles} articles removed.`

    return { success: true, message }
  } catch (error) {
    await session.abortTransaction()
    console.error('Delete Event Transaction Error:', error)
    return { success: false, message: `Failed to delete event: ${error.message}` }
  } finally {
    session.endSession()
  }
}

const baseQuery = { highest_relevance_score: { $gt: 25 } }

export async function getEvents({ page = 1, filters = {}, sort = 'date_desc' }) {
  await dbConnect()
  const { queryFilter, sortOptions } = buildQuery(SynthesizedEvent, {
    filters,
    sort,
    baseQuery,
  })
  const skipAmount = (page - 1) * EVENTS_PER_PAGE

  const events = await SynthesizedEvent.find(queryFilter)
    .sort(sortOptions)
    .skip(skipAmount)
    .limit(EVENTS_PER_PAGE)
    .lean()

  return JSON.parse(JSON.stringify(events))
}

export async function getTotalEventCount({ filters = {} } = {}) {
  await dbConnect()
  const { queryFilter } = buildQuery(SynthesizedEvent, { filters, baseQuery })
  const count = await SynthesizedEvent.countDocuments(queryFilter)
  return count
}
