// apps/client/src/app/api/opportunities/route.js
import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { Opportunity } from '@headlines/models/next'
import { getOpportunities, getTotalOpportunitiesCount } from '@headlines/data-access/next'

const handleGet = async (request, { user }) => {
  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1', 10)
  const sort = searchParams.get('sort') || 'date_desc'
  const q = searchParams.get('q') || ''

  const filters = {}
  if (q) filters.q = q

  const { data, total } = await getOpportunities({
    page,
    filters,
    sort,
    userId: user.userId,
  })

  return NextResponse.json({ success: true, data, total, page })
}

const handlePost = async (request, { user }) => {
  const body = await request.json()

  if (!body.reachOutTo || !body.reachOutTo.trim()) {
    return NextResponse.json({ error: 'reachOutTo (name) is required.' }, { status: 400 })
  }

  const existing = await Opportunity.findOne({
    reachOutTo: { $regex: new RegExp(`^${body.reachOutTo.trim()}$`, 'i') },
  }).lean()

  if (existing) {
    return NextResponse.json(
      { error: 'This person already exists in the database.', existingId: existing._id },
      { status: 409 },
    )
  }

  const opp = new Opportunity({
    ...body,
    type: body.type || 'beneficiary',
    triggerClass: body.triggerClass || 'TC12_INDIVIDUAL_LIST',
    triggerSummary: body.triggerSummary || 'Manually added by admin.',
    priority: body.priority || 'medium',
    createdBy: user.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  await opp.save()

  return NextResponse.json({ success: true, data: opp.toObject() }, { status: 201 })
}

export const GET = createApiHandler(handleGet)
export const POST = createApiHandler(handlePost)