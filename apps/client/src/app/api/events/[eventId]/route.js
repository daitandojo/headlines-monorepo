// apps/client/src/app/api/events/[eventId]/route.js
import { NextResponse } from 'next/server'
import { getEventDetails } from '@headlines/data-access/next'
import { createApiHandler } from '@/lib/api-handler' // Use the new single handler
import mongoose from 'mongoose'

const handleGet = async (request, { params }) => {
  const { eventId } = params

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: 'Invalid Event ID' }, { status: 400 })
  }

  const result = await getEventDetails(eventId)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }

  return NextResponse.json({ data: result.data })
}

// Use the new, unified handler. The default behavior is correct for client routes.
export const GET = createApiHandler(handleGet)
export const dynamic = 'force-dynamic'
