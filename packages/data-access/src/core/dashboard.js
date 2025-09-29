// File: packages/data-access/src/actions/dashboard.js
import {
  Source,
  Subscriber,
  WatchlistEntity,
  Article,
  SynthesizedEvent,
  Opportunity,
  Country,
} from '@headlines/models'
import dbConnect from '../dbConnect.js'

export async function getDashboardStats() {
  try {
    await dbConnect()
    const [
      sourceStats,
      userStats,
      watchlistStats,
      articleStats,
      eventStats,
      opportunityStats,
    ] = await Promise.all([
      Source.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          },
        },
      ]),
      Subscriber.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
          },
        },
      ]),
      WatchlistEntity.aggregate([{ $group: { _id: null, total: { $sum: 1 } } }]),
      Article.aggregate([{ $group: { _id: null, total: { $sum: 1 } } }]),
      SynthesizedEvent.aggregate([{ $group: { _id: null, total: { $sum: 1 } } }]),
      Opportunity.aggregate([{ $group: { _id: null, total: { $sum: 1 } } }]),
    ])

    const stats = {
      sources: sourceStats[0] || { total: 0, active: 0 },
      users: userStats[0] || { total: 0, active: 0 },
      watchlist: watchlistStats[0] || { total: 0 },
      articles: articleStats[0] || { total: 0 },
      events: eventStats[0] || { total: 0 },
      opportunities: opportunityStats[0] || { total: 0 },
    }

    delete stats.sources._id // Clean up aggregation artifact
    delete stats.users._id
    delete stats.watchlist._id
    delete stats.articles._id
    delete stats.events._id
    delete stats.opportunities._id

    return { success: true, data: stats }
  } catch (e) {
    return { success: false, error: 'Failed to fetch dashboard stats.' }
  }
}

// This is the missing function
export async function getGlobalCountries() {
  try {
    await dbConnect()
    const countries = await Country.aggregate([
      { $match: { status: 'active' } },
      {
        $lookup: {
          from: 'synthesized_events',
          localField: 'name',
          foreignField: 'country',
          as: 'events',
        },
      },
      {
        $project: {
          name: 1,
          isoCode: 1,
          count: { $size: '$events' },
        },
      },
      // --- ADD THIS STAGE TO FILTER OUT ZERO-COUNT COUNTRIES ---
      {
        $match: {
          count: { $gt: 0 },
        },
      },
      // ---------------------------------------------------------
      { $sort: { name: 1 } },
    ])
    return { success: true, data: JSON.parse(JSON.stringify(countries)) }
  } catch (e) {
    return { success: false, error: 'Failed to fetch global countries.' }
  }
}
