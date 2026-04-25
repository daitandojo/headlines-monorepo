// apps/client/src/app/api/admin/individuals/search/route.js
'use server'

import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/server'
import { Opportunity } from '@headlines/models/next'
import dbConnect from '@headlines/data-access/dbConnect/next'

const handlePost = async (request) => {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  const { name, company } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }

  await dbConnect()

  const nameRegex = new RegExp(name.trim().split(/\s+/).join('.*'), 'i')
  const matches = await Opportunity.find({
    $or: [
      { reachOutTo: { $regex: nameRegex } },
      ...(company
        ? [{ 'contactDetails.company': { $regex: new RegExp(company, 'i') } }]
        : []),
    ],
  })
    .select('reachOutTo contactDetails profile estimatedNetWorthMM basedIn priority triggerClass relatedIndividuals')
    .limit(5)
    .lean()

  return NextResponse.json({ success: true, matches })
}

export const POST = handlePost