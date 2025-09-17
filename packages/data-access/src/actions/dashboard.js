// packages/data-access/src/actions/dashboard.js (version 2.0.0)
'use server'

import { Source, Subscriber, WatchlistEntity } from '@headlines/models'
import { verifyAdmin } from '@headlines/auth'
import dbConnect from '../dbConnect.js'

export async function getDashboardStats() {
  // This action is called by both the pipeline (no user session) and admin app (admin session).
  // The admin check ensures security for the API route endpoint.
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) {
    // A simple check to see if this is being called from the pipeline (where there's no user)
    // This is a pragmatic way to allow dual use.
    const isPipeline = process.env.IS_PIPELINE_RUN === 'true'
    if (!isPipeline) {
       return { success: false, error }
    }
  }

  try {
    await dbConnect()
    const [sourceStats, userStats, watchlistStats] = await Promise.all([
      Source.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            paused: { $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] } },
            failing: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'active'] }, { $eq: ['$analytics.lastRunHeadlineCount', 0] }, { $gt: ['$analytics.totalRuns', 0] }] }, 1, 0] } },
          },
        },
      ]),
      Subscriber.aggregate([
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } }, admin: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } } } },
      ]),
      WatchlistEntity.aggregate([
        { $match: { status: 'active' } }, // Only count active entities
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ])

    const totalWatchlist = watchlistStats.reduce((acc, item) => acc + item.count, 0)

    const stats = {
      sources: sourceStats[0] || { total: 0, active: 0, paused: 0, failing: 0 },
      users: userStats[0] || { total: 0, active: 0, admin: 0 },
      watchlist: {
        total: totalWatchlist,
        company: watchlistStats.find((s) => s._id === 'company')?.count || 0,
        person: watchlistStats.find((s) => s._id === 'person')?.count || 0,
        family: watchlistStats.find((s) => s._id === 'family')?.count || 0,
      },
    }
    // Remove the internal _id field from aggregations
    delete stats.sources._id;
    delete stats.users._id;
    
    return { success: true, data: stats }
  } catch (e) {
    return { success: false, error: 'Failed to fetch dashboard stats.' }
  }
}
