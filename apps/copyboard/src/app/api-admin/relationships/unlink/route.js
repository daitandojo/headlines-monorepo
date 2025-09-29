import { NextResponse } from 'next/server'
import { unlinkOpportunityFromEventAction } from '../../actions' // We will create this action next

export async function POST(request) {
  try {
    const { eventId, opportunityId } = await request.json()
    const result = await unlinkOpportunityFromEventAction(eventId, opportunityId)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
