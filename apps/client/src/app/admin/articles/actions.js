'use server'

import { revalidatePath } from 'next/cache'
// --- START OF THE FIX ---
// Import the PURE data logic functions from the Next.js-safe entry point.
import { updateArticle, deleteArticle } from '@headlines/data-access'
// Import the Next.js-safe version of the dbConnect utility.
import dbConnect from '@headlines/data-access/dbConnect/next'
// --- END OF THE FIX ---

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
