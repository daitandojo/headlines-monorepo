'use server'

import { revalidatePath } from 'next/cache'
// Import PURE functions from the data-access package
import { updateArticle, deleteArticle } from '@headlines/data-access'
import dbConnect from '@headlines/data-access/dbConnect.js'

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
