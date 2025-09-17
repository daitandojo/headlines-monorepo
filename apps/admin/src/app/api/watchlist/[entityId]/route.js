// apps/admin/src/app/api/watchlist/[entityId]/route.js (version 3.0.1)
import { NextResponse } from 'next/server'
import { updateWatchlistEntity, deleteWatchlistEntity } from '@headlines/data-access/src/index.js'
import mongoose from 'mongoose'
import { verifyAdmin } from '@headlines/auth/src/index.js'
import { initializeSharedLogic } from '@/lib/init-shared-logic.js';

export async function PATCH(request, { params }) {
  await initializeSharedLogic();

  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  const { entityId } = params
  if (!mongoose.Types.ObjectId.isValid(entityId)) {
    return NextResponse.json({ error: 'Invalid entity ID' }, { status: 400 })
  }
  const body = await request.json()
  const result = await updateWatchlistEntity(entityId, body)
  if (!result.success) {
    const status = result.error.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ message: 'Watchlist entity updated', entity: result.data });
}

export async function DELETE(request, { params }) {
  await initializeSharedLogic();
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  const { entityId } = params
  if (!mongoose.Types.ObjectId.isValid(entityId)) {
    return NextResponse.json({ error: 'Invalid entity ID' }, { status: 400 })
  }
  const result = await deleteWatchlistEntity(entityId)
  if (!result.success) {
    const status = result.error.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ message: 'Watchlist entity deleted' });
}
