import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// apps/admin/src/app/api/run-verdicts/[runId]/route.js (version 3.0.1)
import { NextResponse } from 'next/server'
import { getRunVerdictById } from '@headlines/data-access/src/index.js'
import mongoose from 'mongoose'
import { verifyAdmin } from '@headlines/auth/src/index.js'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  await initializeSharedLogic();

  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  const { runId } = params
  if (!mongoose.Types.ObjectId.isValid(runId)) {
    return NextResponse.json({ error: 'Invalid Run ID' }, { status: 400 })
  }
  const result = await getRunVerdictById(runId)
  if (!result.success) {
    const status = result.error.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: result.error, details: result.error }, { status });
  }
  return NextResponse.json({ verdict: result.data });
}
