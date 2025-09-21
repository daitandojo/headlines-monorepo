// apps/client/src/app/api/user/interactions/route.js (version 2.0.0)
import { NextResponse } from 'next/server'
import { updateUserInteraction } from '@headlines/data-access'
import { verifySession } from '@headlines/auth'

export async function POST(request) {
  const { user, error } = await verifySession()
  if (!user) {
    return NextResponse.json(
      { error: error || 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const { itemId, itemType, action } = await request.json()
    const result = await updateUserInteraction({
      userId: user.userId,
      itemId,
      itemType,
      action,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
