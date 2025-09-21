import { initializeSharedLogic } from '@/lib/init-shared-logic.js'
// apps/admin/src/app/api/dashboard-stats/route.js (version 4.0.2)
import { NextResponse } from 'next/server'
import { getDashboardStats } from '@headlines/actions'
import { verifyAdmin } from '@headlines/auth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  await initializeSharedLogic()

  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  const result = await getDashboardStats()
  if (!result.success) {
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats.', details: result.error },
      { status: 500 }
    )
  }
  return NextResponse.json({ stats: result.data })
}
