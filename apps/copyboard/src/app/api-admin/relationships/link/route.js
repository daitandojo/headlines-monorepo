import { NextResponse } from 'next/server'
import { linkOpportunityToEventAction } from '../../actions' // We will create this action next

// This is a simplified handler that doesn't use the full createApiHandler
// because it calls a Server Action directly.
export async function POST(request) {
  try {
    const { eventId, opportunityId } = await request.json()
    const result = await linkOpportunityToEventAction(eventId, opportunityId)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
