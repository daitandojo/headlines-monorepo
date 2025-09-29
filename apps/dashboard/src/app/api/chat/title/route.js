// apps/client/src/app/api/chat/title/route.js
import { NextResponse } from 'next/server'
import { generateChatTitle } from '@headlines/data-access/server' // Use the server entry point
import { verifySession } from '@shared/auth'

export async function POST(request) {
  const { user, error } = await verifySession()
  if (!user) {
    return NextResponse.json(
      { error: error || 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const { messages } = await request.json()
    const result = await generateChatTitle(messages)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
