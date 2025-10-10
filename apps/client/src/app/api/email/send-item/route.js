// apps/client/src/app/api/email/send-item/route.js
import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { sendItemByEmail } from '@headlines/data-access/next'
import { z } from 'zod'

const sendItemSchema = z.object({
  itemId: z.string().min(1),
  itemType: z.enum(['event', 'opportunity', 'article']),
})

const handlePost = async (request, { user }) => {
  const body = await request.json()
  const validation = sendItemSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input.', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const { itemId, itemType } = validation.data
  const result = await sendItemByEmail(itemId, itemType, user.userId)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json(result)
}

export const POST = createApiHandler(handlePost)
export const dynamic = 'force-dynamic'
