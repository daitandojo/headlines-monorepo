// File: apps/client/src/app/api-admin/run-verdicts/[runId]/route.js
import { NextResponse } from 'next/server'
import { getRunVerdictById } from '@headlines/data-access'
import { createApiHandler } from '@/lib/api-handler'
import mongoose from 'mongoose'

const handleGet = async (request, { params }) => {
  const { runId } = params
  if (!mongoose.Types.ObjectId.isValid(runId)) {
    return NextResponse.json({ error: 'Invalid Run ID' }, { status: 400 })
  }

  const result = await getRunVerdictById(runId)
  if (!result.success) {
    const status = result.error.includes('not found') ? 404 : 500
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ verdict: result.data })
}

export const GET = createApiHandler(handleGet)
export const dynamic = 'force-dynamic'
