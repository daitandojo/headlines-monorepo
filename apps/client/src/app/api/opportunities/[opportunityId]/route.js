// sourcePack.txt created file apps/client/src/app/api/opportunities/[opportunityId]/route.js

import { NextResponse } from 'next/server'
import { getOpportunityDetails } from '@headlines/data-access/next'
import { createClientApiHandler } from '@/lib/api-handler'
import mongoose from 'mongoose'

const handleGet = async (request, { params }) => {
  const { opportunityId } = params

  if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
    return NextResponse.json({ error: 'Invalid Opportunity ID' }, { status: 400 })
  }

  const result = await getOpportunityDetails(opportunityId)

  if (!result.success || !result.data) {
    return NextResponse.json(
      { success: false, error: result.error || 'Not Found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, data: result.data })
}

export const GET = createClientApiHandler(handleGet)
export const dynamic = 'force-dynamic'
