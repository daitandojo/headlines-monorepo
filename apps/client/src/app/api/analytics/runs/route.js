// apps/client/src/app/api-admin/analytics/runs/route.js
import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { RunVerdict } from '@headlines/models/next'

const handleGet = async (request) => {
  // Fetch all verdicts to build a complete historical picture.
  // For a production system with many runs, you would add pagination here.
  const runVerdicts = await RunVerdict.find({})
    .sort({ createdAt: -1 })
    .select('createdAt duration_seconds cost_summary runStats.eventsSynthesized')
    .lean()

  // Add a totalCost field to the cost_summary for easier frontend consumption
  const formattedData = runVerdicts.map((run) => {
    const tokenCost = run.cost_summary?.tokens
      ? Object.values(run.cost_summary.tokens).reduce((acc, model) => acc + model.cost, 0)
      : 0
    const apiCost = run.cost_summary?.apis
      ? Object.values(run.cost_summary.apis).reduce(
          (acc, service) => acc + service.cost,
          0
        )
      : 0

    return {
      ...run,
      cost_summary: {
        ...run.cost_summary,
        totalCost: tokenCost + apiCost,
      },
    }
  })

  return NextResponse.json({ success: true, data: formattedData })
}

export const GET = createApiHandler(handleGet, { requireAdmin: true })
export const dynamic = 'force-dynamic'
