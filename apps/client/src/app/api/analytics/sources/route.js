    
// apps/client/src/app/api-admin/analytics/sources/route.js
import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { Source } from '@headlines/models/next'

const handleGet = async (request) => {
  const sourcesWithAnalytics = await Source.aggregate([
    {
      $project: {
        name: 1,
        country: 1,
        status: 1,
        lastScrapedAt: 1,
        'analytics.totalRuns': 1,
        'analytics.totalSuccesses': 1,
        'analytics.totalScraped': 1,
        'analytics.totalRelevant': 1,
        'analytics.lastRunHeadlineCount': 1,
        leadRate: {
          $cond: {
            if: { $gt: ['$analytics.totalScraped', 0] },
            then: { $divide: ['$analytics.totalRelevant', '$analytics.totalScraped'] },
            else: 0,
          },
        },
        successRate: {
          $cond: {
            if: { $gt: ['$analytics.totalRuns', 0] },
            then: { $divide: ['$analytics.totalSuccesses', '$analytics.totalRuns'] },
            else: 0,
          },
        },
      },
    },
    {
      $sort: {
        leadRate: -1,
      },
    },
  ])

  return NextResponse.json({ success: true, data: sourcesWithAnalytics })
}

export const GET = createApiHandler(handleGet, { requireAdmin: true })
export const dynamic = 'force-dynamic'

  