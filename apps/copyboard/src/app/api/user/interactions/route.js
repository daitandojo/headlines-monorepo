import { NextResponse } from 'next/server'
import { updateUserInteraction } from '@headlines/data-access'
import { createClientApiHandler } from '@/lib/api-handler' // Use the new client handler

const handlePost = async (request, { user }) => {
  const { itemId, itemType, action } = await request.json()
  const result = await updateUserInteraction({
    userId: user.userId,
    itemId,
    itemType,
    action,
  })

  if (!result.success) {
    // Let the handler manage the 500 error, return 400 for bad input
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export const POST = createClientApiHandler(handlePost)
