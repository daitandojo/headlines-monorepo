// apps/admin/src/app/api/sources/route.js (version 2.0.1)
import { NextResponse } from 'next/server'
import { getAllSources, createSource } from '@headlines/data-access'
import { verifyAdmin } from '@headlines/auth'
import { initializeSharedLogic } from '@/lib/init-shared-logic.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  await initializeSharedLogic()
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return NextResponse.json({ error }, { status: 401 })

  const result = await getAllSources()
  if (!result.success) {
    return NextResponse.json(
      { error: 'Failed to fetch sources.', details: result.error },
      { status: 500 }
    )
  }
  return NextResponse.json({ sources: result.data })
}

export async function POST(request) {
  await initializeSharedLogic()
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return NextResponse.json({ error }, { status: 401 })

  const body = await request.json()
  const result = await createSource(body)
  if (!result.success) {
    const status = result.error.includes('exists') ? 409 : 500
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ success: true, source: result.data }, { status: 201 })
}
