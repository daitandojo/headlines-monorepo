// apps/client/src/app/api/user/settings/clear-discarded/route.js
'use server'

import { NextResponse } from 'next/server'
import { clearDiscardedItems } from '@headlines/data-access/next'
import { createApiHandler } from '@/lib/api-handler' // Use the new single handler

const handlePost = async (request, { user }) => {
  const result = await clearDiscardedItems(user.userId)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true, message: result.message })
}

export const POST = createApiHandler(handlePost)
