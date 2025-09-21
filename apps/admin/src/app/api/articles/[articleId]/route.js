// apps/admin/src/app/api/articles/[articleId]/route.js (NEW FILE)
import { NextResponse } from 'next/server'
import { updateAdminArticle, deleteAdminArticle } from '@headlines/data-access'
import { verifyAdmin } from '@headlines/auth'
import { initializeSharedLogic } from '@/lib/init-shared-logic.js'
import mongoose from 'mongoose'

export async function PATCH(request, { params }) {
  await initializeSharedLogic()
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return NextResponse.json({ error }, { status: 401 })

  const { articleId } = params
  if (!mongoose.Types.ObjectId.isValid(articleId)) {
    return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 })
  }

  const updateData = await request.json()
  const result = await updateAdminArticle(articleId, updateData)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json(result)
}

export async function DELETE(request, { params }) {
  await initializeSharedLogic()
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return NextResponse.json({ error }, { status: 401 })

  const { articleId } = params
  if (!mongoose.Types.ObjectId.isValid(articleId)) {
    return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 })
  }

  const result = await deleteAdminArticle(articleId)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
