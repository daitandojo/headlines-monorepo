// apps/client/src/app/api/subscribers/me/route.js (version 2.0.0)
import { NextResponse } from 'next/server'
import { getCurrentSubscriber } from '@headlines/data-access'
import { getUserIdFromSession } from '@headlines/auth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const userId = await getUserIdFromSession()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const result = await getCurrentSubscriber(userId)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }
  return NextResponse.json(result.data)
}
