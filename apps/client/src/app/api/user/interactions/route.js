// apps/client/src/app/api/user/interactions/route.js
import { NextResponse } from 'next/server'
import { updateUserInteraction } from '@headlines/data-access/next'
import { createClientApiHandler } from '@/lib/api-handler'
import { interactionSchema } from '@headlines/models/schemas'

const handlePost = async (request, { user }) => {
  const body = await request.json()
  const validation = interactionSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input.', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const result = await updateUserInteraction({
    userId: user.userId,
    ...validation.data,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export const POST = createClientApiHandler(handlePost)
export const dynamic = 'force-dynamic'
