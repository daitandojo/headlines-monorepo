// apps/admin/src/app/api/subscribers/[subscriberId]/route.js (version 3.0.1)
import { NextResponse } from 'next/server'
import { updateSubscriber, deleteSubscriber } from '@headlines/data-access/src/index.js'
import mongoose from 'mongoose'
import { verifyAdmin } from '@headlines/auth/src/index.js'
import { initializeSharedLogic } from '@/lib/init-shared-logic.js';

export async function PATCH(request, { params }) {
  await initializeSharedLogic();

  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  const { subscriberId } = params
  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    return NextResponse.json({ error: 'Invalid subscriber ID' }, { status: 400 })
  }
  const body = await request.json()
  const result = await updateSubscriber(subscriberId, body)
  if (!result.success) {
    const status = result.error.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ message: 'Subscriber updated', subscriber: result.data });
}

export async function DELETE(request, { params }) {
  await initializeSharedLogic();
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  const { subscriberId } = params
  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    return NextResponse.json({ error: 'Invalid subscriber ID' }, { status: 400 })
  }
  const result = await deleteSubscriber(subscriberId)
  if (!result.success) {
    const status = result.error.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ message: 'Subscriber deleted successfully' });
}
