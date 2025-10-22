// apps/client/src/app/api/user/profile/route.js
'use server'

import { NextResponse } from 'next/server'
import { updateUserProfile } from '@headlines/data-access/next'
import { createApiHandler } from '@/lib/api-handler'

const handlePatch = async (request, { user }) => {
  const updateData = await request.json()
  const result = await updateUserProfile({ userId: user.userId, updateData })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result.user)
}

export const PATCH = createApiHandler(handlePatch)
