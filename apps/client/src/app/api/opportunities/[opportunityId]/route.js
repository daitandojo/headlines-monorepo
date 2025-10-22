// apps/client/src/app/api/opportunities/[opportunityId]/route.js
import { NextResponse } from 'next/server'
import { getOpportunityDetails } from '@headlines/data-access/next'
import { createApiHandler } from '@/lib/api-handler' // DEFINITIVE FIX: Use the standard, robust API handler.
import mongoose from 'mongoose'

const handleGet = async (request, { params }) => {
  const { opportunityId } = params

  if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid Opportunity ID' },
      { status: 400 }
    )
  }

  const result = await getOpportunityDetails(opportunityId)

  if (!result.success || !result.data) {
    // This will now be correctly handled by the notFound() call in the page component.
    return NextResponse.json(
      { success: false, error: result.error || 'Not Found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, data: result.data })
}

export const GET = createApiHandler(handleGet)
export const dynamic = 'force-dynamic'
