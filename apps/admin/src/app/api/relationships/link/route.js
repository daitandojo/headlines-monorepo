// apps/admin/src/app/api/relationships/link/route.js (NEW FILE)
import { NextResponse } from 'next/server'
import { linkOpportunityToEvent } from '@headlines/data-access'
import { verifyAdmin } from '@headlines/auth'
import { initializeSharedLogic } from '@/lib/init-shared-logic.js'

export async function POST(request) {
  await initializeSharedLogic()
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return NextResponse.json({ error }, { status: 401 })

  try {
    const { eventId, opportunityId } = await request.json()
    const result = await linkOpportunityToEvent(eventId, opportunityId)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
