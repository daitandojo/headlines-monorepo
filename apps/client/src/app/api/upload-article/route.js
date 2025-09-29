'use server'

import { NextResponse } from 'next/server'
import { processUploadedArticle } from '@headlines/data-access'
import { createClientApiHandler } from '@/lib/api-handler' // Use the new client handler

const handlePost = async (request, { user }) => {
  const { item } = await request.json()
  if (!item || !item.headline || !item.article) {
    return NextResponse.json({ error: 'Invalid item structure.' }, { status: 400 })
  }

  // The userId is automatically passed via the user object from the handler
  const result = await processUploadedArticle(item, user.userId)

  if (!result.success) {
    // Let the handler manage the 500 error
    throw new Error(result.error || 'Failed to process article')
  }

  return NextResponse.json(result)
}

export const POST = createClientApiHandler(handlePost)
