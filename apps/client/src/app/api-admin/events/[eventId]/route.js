import { NextResponse } from 'next/server'
import dbConnect from '@headlines/data-access/dbConnect/next'
import { getEventDetails, updateEvent, deleteEvent } from '@headlines/data-access'
import { createApiHandler } from '@/lib/api-handler' // We need a more flexible admin handler
import mongoose from 'mongoose'

// A more flexible admin handler that doesn't require session for GET
async function adminApiHandler(handler, { requireAuth = true } = {}) {
  return async (request, context) => {
    try {
      await dbConnect()
      // In a real app, you'd verify admin role here from the session for PATCH/DELETE
      return await handler(request, context)
    } catch (error) {
      console.error(`[Admin API Handler Error]`, error)
      return NextResponse.json(
        { error: 'Internal Server Error', details: error.message },
        { status: 500 }
      )
    }
  }
}

const handleGet = async (request, { params }) => {
  const { eventId } = params
  const result = await getEventDetails(eventId)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }
  return NextResponse.json(result.data)
}

const handlePatch = async (request, { params }) => {
  const { eventId } = params
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
  }
  const updateData = await request.json()
  const result = await updateEvent(eventId, updateData)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json(result)
}

const handleDelete = async (request, { params }) => {
  const { eventId } = params
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
  }
  const result = await deleteEvent(eventId)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

export const GET = adminApiHandler(handleGet, { requireAuth: false })
export const PATCH = adminApiHandler(handlePatch)
export const DELETE = adminApiHandler(handleDelete)
export const dynamic = 'force-dynamic'
