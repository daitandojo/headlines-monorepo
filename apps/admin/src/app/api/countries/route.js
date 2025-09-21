// apps/admin/src/app/api/countries/route.js (version 2.0.1)
import { NextResponse } from 'next/server'
import { getAllCountries, createCountry } from '@headlines/data-access'
import { verifyAdmin } from '@headlines/auth'
import { initializeSharedLogic } from '@/lib/init-shared-logic.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  await initializeSharedLogic()
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return NextResponse.json({ error }, { status: 401 })

  const result = await getAllCountries()
  if (!result.success) {
    return NextResponse.json(
      { error: 'Failed to fetch countries.', details: result.error },
      { status: 500 }
    )
  }
  return NextResponse.json({ countries: result.data })
}

export async function POST(request) {
  await initializeSharedLogic()
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return NextResponse.json({ error }, { status: 401 })

  const body = await request.json()
  const result = await createCountry(body)
  if (!result.success) {
    const status = result.error.includes('exists') ? 409 : 500
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ success: true, country: result.data }, { status: 201 })
}
