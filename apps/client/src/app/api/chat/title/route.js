// apps/client/src/app/api/chat/title/route.js
import { NextResponse } from 'next/server'
import { generateChatTitle } from '@headlines/data-access/next'
import { verifySession } from '@/lib/auth/server'
import { chatSchema } from '@headlines/models/schemas'

export async function POST(request) {
  const { user, error } = await verifySession()
  if (!user) {
    return NextResponse.json(
      { error: error || 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const validation = chatSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid chat message structure.',
          details: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const result = await generateChatTitle(validation.data.messages)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
