import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// apps/admin/src/app/api/countries/[countryId]/route.js (version 3.0.1)
import { NextResponse } from 'next/server'
import { updateCountry } from '@headlines/data-access/src/index.js'
import mongoose from 'mongoose'
import { verifyAdmin } from '@headlines/auth/src/index.js'

export async function PATCH(request, { params }) {
  await initializeSharedLogic();

  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  const { countryId } = params
  if (!mongoose.Types.ObjectId.isValid(countryId)) {
    return NextResponse.json({ error: 'Invalid country ID' }, { status: 400 })
  }
  const body = await request.json()
  const result = await updateCountry(countryId, body)

  if (!result.success) {
    const status = result.error.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: result.error, details: result.error }, { status });
  }
  return NextResponse.json({ message: 'Country updated', country: result.data });
}
