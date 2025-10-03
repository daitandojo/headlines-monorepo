// apps/client/src/app/api/auth/session/route.js
import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth/server'
import { Subscriber } from '@headlines/models/next'
import dbConnect from '@headlines/data-access/dbConnect/next'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  await dbConnect()

  const { user, error } = await verifySession()

  if (error) {
    return NextResponse.json({ error: 'No active session' }, { status: 401 })
  }

  try {
    // Re-fetch the user from the database to get the latest data
    const freshUser = await Subscriber.findById(user.userId).lean()
    if (!freshUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Don't send back the password hash
    const { password, ...userPayload } = freshUser

    return NextResponse.json({ user: userPayload })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
