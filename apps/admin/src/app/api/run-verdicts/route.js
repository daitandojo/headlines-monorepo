import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// apps/admin/src/app/api/run-verdicts/route.js (version 3.0.2)
import { NextResponse } from 'next/server'
import { getRecentRunVerdicts } from '@headlines/data-access'
import { verifyAdmin } from '@headlines/auth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  await initializeSharedLogic();

  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }
  
  const result = await getRecentRunVerdicts()
  if (!result.success) {
    return NextResponse.json({ error: 'Failed to fetch verdicts.', details: result.error }, { status: 500 });
  }
  // Data is already sanitized in the data-access action
  return NextResponse.json({ verdicts: result.data });
}
