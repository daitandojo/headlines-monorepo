// apps/client/src/app/api/user/interactions/route.js
import { NextResponse } from 'next/server'
import { updateUserInteraction } from '@headlines/data-access/next'
import { createApiHandler } from '@/lib/api-handler' // Use the new single handler
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

// Use the new, unified handler. The default behavior is correct for client routes.
export const POST = createApiHandler(handlePost)
export const dynamic = 'force-dynamic'
