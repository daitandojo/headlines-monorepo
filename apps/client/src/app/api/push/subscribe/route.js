// apps/client/src/app/api/push/subscribe/route.js (version 2.0.0)
import { NextResponse } from 'next/server'
import { savePushSubscription } from '@headlines/data-access'
import { getUserIdFromSession } from '@headlines/auth'

export async function POST(req) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const subscription = await req.json()
    const result = await savePushSubscription(subscription, userId)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
