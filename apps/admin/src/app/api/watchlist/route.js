// apps/admin/src/app/api/watchlist/route.js (version 3.0.1)
import { NextResponse } from 'next/server'
import { getAllWatchlistEntities, createWatchlistEntity } from '@headlines/data-access/src/index.js'
import { verifyAdmin } from '@headlines/auth/src/index.js'
import { initializeSharedLogic } from '@/lib/init-shared-logic.js';

export const dynamic = 'force-dynamic'

export async function GET(request) {
  await initializeSharedLogic();

  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  const result = await getAllWatchlistEntities()
  if (!result.success) {
    return NextResponse.json({ error: 'Failed to fetch watchlist.', details: result.error }, { status: 500 });
  }
  return NextResponse.json({ entities: result.data });
}

export async function POST(request) {
  await initializeSharedLogic();
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  const body = await request.json()
  const result = await createWatchlistEntity(body)
  if (!result.success) {
    const status = result.error.includes('already exists') ? 409 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ success: true, entity: result.data }, { status: 201 });
}
