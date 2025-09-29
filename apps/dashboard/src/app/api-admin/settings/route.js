// apps/admin/src/app/api/settings/route.js (version 1.0.1)
import { NextResponse } from 'next/server'
import { getSettings, updateSettings } from '@headlines/data-access'
import { verifyAdmin } from '@headlines/auth'
import { initializeSharedLogic } from '@/lib/init-shared-logic.js'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  await initializeSharedLogic()
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return NextResponse.json({ error }, { status: 401 })

  const result = await getSettings()
  if (!result.success) {
    return NextResponse.json(
      { error: 'Failed to fetch settings.', details: result.error },
      { status: 500 }
    )
  }
  return NextResponse.json({ settings: result.data })
}

export async function PATCH(request) {
  await initializeSharedLogic()
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return NextResponse.json({ error }, { status: 401 })

  const body = await request.json()
  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Request body must be an array of settings.' },
      { status: 400 }
    )
  }
  const result = await updateSettings(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Failed to update settings', details: result.error },
      { status: 500 }
    )
  }
  return NextResponse.json({ message: result.message })
}
