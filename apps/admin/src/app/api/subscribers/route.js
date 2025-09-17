// apps/admin/src/app/api/subscribers/route.js (version 3.0.2)
import { NextResponse } from 'next/server'
import { getAllSubscribers, createSubscriber } from '@headlines/data-access'
import { verifyAdmin } from '@headlines/auth'
import { initializeSharedLogic } from '@/lib/init-shared-logic.js';

export const dynamic = 'force-dynamic'

export async function GET(request) {
  await initializeSharedLogic();

  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  const result = await getAllSubscribers()
  if (!result.success) {
    return NextResponse.json({ error: 'Failed to fetch subscribers.', details: result.error }, { status: 500 });
  }
  // Data is already sanitized in the data-access action
  return NextResponse.json({ subscribers: result.data });
}

export async function POST(request) {
  await initializeSharedLogic();
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  const body = await request.json()
  const result = await createSubscriber(body)
  if (!result.success) {
    const status = result.error.includes('already exists') ? 409 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ success: true, subscriber: result.data }, { status: 201 });
}
