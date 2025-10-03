import { NextResponse } from 'next/server'
// --- START DEFINITIVE FIX ---
// Import the environment-specific dbConnect for the unwrapped GET handler
import dbConnect from '@headlines/data-access/dbConnect/next'
// Import data access functions from the Next.js-safe entry point
import {
  updateArticle,
  deleteArticle,
  getArticleDetails,
} from '@headlines/data-access/next'
// --- END DEFINITIVE FIX ---
import { Article } from '@headlines/models'
import { createApiHandler } from '@/lib/api-handler'
import mongoose from 'mongoose'

// This GET handler is NOT wrapped by createApiHandler (e.g., if it needs to be public).
// Therefore, it is responsible for its own database connection.
const handleGet = async (request, { params }) => {
  await dbConnect()
  const { articleId } = params
  if (!mongoose.Types.ObjectId.isValid(articleId)) {
    return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 })
  }
  // The `getArticleDetails` function is now isomorphic and doesn't connect itself.
  const result = await getArticleDetails(articleId)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }
  return NextResponse.json(result.data)
}

// These handlers ARE wrapped by createApiHandler, which handles the db connection.
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

export const GET = handleGet
export const PATCH = createApiHandler(handlePatch)
export const DELETE = createApiHandler(handleDelete)
export const dynamic = 'force-dynamic'
