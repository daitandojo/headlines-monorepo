// apps/admin/src/app/api/events/[eventId]/route.js (version 2.0.2)
import { NextResponse } from 'next/server'
import { getEventDetails, updateEvent, deleteEvent } from '@headlines/data-access'
import { createApiHandler } from '@/lib/api-handler'
import mongoose from 'mongoose'

const handleGet = async (request, { params }) => {
  const { eventId } = params
  const result = await getEventDetails(eventId)
  if (!result.success) {
    throw new Error(result.error)
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
    throw new Error(result.error)
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
    throw new Error(result.error)
  }
  return NextResponse.json({ success: true })
}

export const GET = createApiHandler(handleGet)
export const PATCH = createApiHandler(handlePatch)
export const DELETE = createApiHandler(handleDelete)
export const dynamic = 'force-dynamic'
