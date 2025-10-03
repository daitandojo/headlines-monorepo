// apps/client/src/app/admin/articles/actions.js (version 2.0.0)
'use server'

import { revalidatePath } from 'next/cache'
// Import the PURE data logic functions from the Next.js-safe entry point.
import { updateArticle, deleteArticle } from '@headlines/data-access/next'
// ARCHITECTURAL NOTE: Server Actions are another top-level entry point.
// They are responsible for establishing their own database connection.
import dbConnect from '@headlines/data-access/dbConnect/next'

// This file defines the Server Actions. It wraps the pure data logic.
export async function updateArticleAction(articleId, updateData) {
  await dbConnect() // Connect to DB within the action
  const result = await updateArticle(articleId, updateData)
  if (result.success) {
    revalidatePath('/admin/articles')
  }
  return result
}

export async function deleteArticleAction(articleId) {
  await dbConnect() // Connect to DB within the action
  const result = await deleteArticle(articleId)
  if (result.success) {
    revalidatePath('/admin/articles')
  }
  return result
}
