// packages/data-access/src/actions/dashboard.js (version 2.0.1)
'use server'

import {
  Source,
  Subscriber,
  WatchlistEntity,
  Article,
  SynthesizedEvent,
  Opportunity,
} from '../../../models/src/index.js'
import { verifySession } from '../../../auth/src/index.js'
import dbConnect from '../dbConnect.js'

export async function getDashboardStats() {
  const { user } = await verifySession()
  const isPipeline = process.env.IS_PIPELINE_RUN === 'true'
  if (!user && !isPipeline) {
    return { success: false, error: 'Authentication required.' }
  }

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

    delete stats.sources._id
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
