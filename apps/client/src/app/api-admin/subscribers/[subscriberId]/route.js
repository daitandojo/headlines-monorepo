// File: apps/client/src/app/api-admin/subscribers/[subscriberId]/route.js (version 1.0 - Unchanged)
import { NextResponse } from 'next/server'
import { updateSubscriber, deleteSubscriber } from '@headlines/data-access'
import mongoose from 'mongoose'
import { createApiHandler } from '@/lib/api-handler'

const handlePatch = async (request, { params }) => {
  const { subscriberId } = params
  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    return NextResponse.json({ error: 'Invalid subscriber ID' }, { status: 400 })
  }
  const body = await request.json()
  const result = await updateSubscriber(subscriberId, body)
  if (!result.success) {
    const status = result.error.includes('not found') ? 404 : 500
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({
    message: 'Subscriber updated',
    subscriber: result.subscriber,
  })
}

const handleDelete = async (request, { params }) => {
  const { subscriberId } = params
  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    return NextResponse.json({ error: 'Invalid subscriber ID' }, { status: 400 })
  }
  const result = await deleteSubscriber(subscriberId)
  if (!result.success) {
    const status = result.error.includes('not found') ? 404 : 500
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ message: 'Subscriber deleted successfully' })
}

export const PATCH = createApiHandler(handlePatch)
export const DELETE = createApiHandler(handleDelete)
