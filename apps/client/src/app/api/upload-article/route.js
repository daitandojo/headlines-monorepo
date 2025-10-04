// apps/client/src/app/api/upload-article/route.js
'use server'

import { NextResponse } from 'next/server'
import { processUploadedArticle } from '@headlines/ai-services/next' // CORRECTED IMPORT
import { createClientApiHandler } from '@/lib/api-handler'
import { articleUploadSchema } from '@headlines/models/schemas'

const handlePost = async (request, { user }) => {
  const body = await request.json()
  const validation = articleUploadSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input.', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const result = await processUploadedArticle(validation.data.item, user.userId)

  if (!result.success) {
    throw new Error(result.error || 'Failed to process article')
  }

  return NextResponse.json(result)
}

export const POST = createClientApiHandler(handlePost)
