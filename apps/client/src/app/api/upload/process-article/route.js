// apps/client/src/app/api/upload/process-article/route.js
'use server'

import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { articleUploadSchema } from '@headlines/models/schemas'
import { processUploadedArticle } from '@headlines/ai-services/next'

const handlePost = async (request, { user }) => {
  const body = await request.json()
  const validation = articleUploadSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input.', details: validation.error.flatten() },
      { status: 400 },
    )
  }

  const result = await processUploadedArticle(validation.data.item, user.userId)

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to process article' }, { status: 500 })
  }

  return NextResponse.json(result)
}

export const POST = createApiHandler(handlePost)