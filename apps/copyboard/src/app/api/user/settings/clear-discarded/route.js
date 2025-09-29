'use server'

import { NextResponse } from 'next/server'
import { clearDiscardedItems } from '@headlines/data-access'
import { createClientApiHandler } from '@/lib/api-handler' // Use the new client handler

const handlePost = async (request, { user }) => {
  const result = await clearDiscardedItems(user.userId)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true, message: result.message })
}

export const POST = createClientApiHandler(handlePost)
