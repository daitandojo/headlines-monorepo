// apps/admin/src/app/api/opportunities/[opportunityId]/route.js (NEW FILE)
import { NextResponse } from 'next/server'
import { updateAdminOpportunity, deleteAdminOpportunity } from '@headlines/data-access'
import { verifyAdmin } from '@headlines/auth'
import { initializeSharedLogic } from '@/lib/init-shared-logic.js'
import mongoose from 'mongoose'

export async function PATCH(request, { params }) {
  await initializeSharedLogic()
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return NextResponse.json({ error }, { status: 401 })

  const { opportunityId } = params
  if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
    return NextResponse.json({ error: 'Invalid opportunity ID' }, { status: 400 })
  }

  const updateData = await request.json()
  const result = await updateAdminOpportunity(opportunityId, updateData)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json(result)
}

export async function DELETE(request, { params }) {
  await initializeSharedLogic()
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return NextResponse.json({ error }, { status: 401 })

  const { opportunityId } = params
  if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
    return NextResponse.json({ error: 'Invalid opportunity ID' }, { status: 400 })
  }

  const result = await deleteAdminOpportunity(opportunityId)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
