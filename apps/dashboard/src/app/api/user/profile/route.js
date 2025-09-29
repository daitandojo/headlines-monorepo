// apps/client/src/app/api/user/profile/route.js (version 2.0.1)
import { NextResponse } from 'next/server'
import { updateUserProfile } from '@headlines/data-access'
import { getUserIdFromSession } from '@shared/auth'

export async function PATCH(request) {
  const userId = await getUserIdFromSession()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const updateData = await request.json()

    // Server-side validation can be added here if needed

    const result = await updateUserProfile({ userId, updateData })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.user)
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
