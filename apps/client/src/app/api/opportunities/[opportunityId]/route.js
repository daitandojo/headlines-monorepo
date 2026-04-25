// apps/client/src/app/api/opportunities/[opportunityId]/route.js
import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { getOpportunityDetails, updateOpportunity } from '@headlines/data-access/next'
import mongoose from 'mongoose'

const handleGet = async (request, { params }) => {
  const { opportunityId } = params
  if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
    return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 })
  }
  const result = await getOpportunityDetails(opportunityId)
  if (!result.success || !result.data) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }
  return NextResponse.json({ success: true, data: result.data })
}

const handlePatch = async (request, { params }) => {
  const { opportunityId } = params
  if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
    return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 })
  }

  const body = await request.json()
  const ALLOWED_FIELDS = [
    'reachOutTo',
    'contactDetails',
    'whyContact',
    'profile',
    'accessPath',
    'liquidityEvent',
    'priority',
    'basedIn',
    'lastKnownEventLiquidityMM',
    'triggerClass',
    'triggerSummary',
    'relatedIndividuals',
    'notes',
    'adminNotes',
  ]
  const updateData = {}
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      updateData[field] = body[field]
    }
  }
  updateData.updatedAt = new Date()

  const result = await updateOpportunity(opportunityId, updateData)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }
  return NextResponse.json({ success: true, data: result.data })
}

export const GET = createApiHandler(handleGet)
export const PATCH = createApiHandler(handlePatch)