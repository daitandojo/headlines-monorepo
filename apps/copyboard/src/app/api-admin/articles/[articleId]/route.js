import { NextResponse } from 'next/server'
import dbConnect from '@headlines/data-access/dbConnect'
import { updateArticle, deleteArticle } from '@headlines/data-access'
import { Article } from '@headlines/models' // Import the model for GET
import { createApiHandler } from '@/lib/api-handler'
import mongoose from 'mongoose'

// We need a GET handler that is not wrapped by the default auth handler
const handleGet = async (request, { params }) => {
  await dbConnect()
  const { articleId } = params
  if (!mongoose.Types.ObjectId.isValid(articleId)) {
    return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 })
  }
  const article = await Article.findById(articleId).lean()
  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }
  return NextResponse.json(article)
}

const handlePatch = async (request, { params }) => {
  const { articleId } = params
  const updateData = await request.json()
  const result = await updateArticle(articleId, updateData)
  if (!result.success) {
    throw new Error(result.error)
  }
  return NextResponse.json(result)
}

const handleDelete = async (request, { params }) => {
  const { articleId } = params
  const result = await deleteArticle(articleId)
  if (!result.success) {
    throw new Error(result.error)
  }
  return NextResponse.json(result)
}

export const GET = handleGet // Export directly
export const PATCH = createApiHandler(handlePatch)
export const DELETE = createApiHandler(handleDelete)
export const dynamic = 'force-dynamic'
