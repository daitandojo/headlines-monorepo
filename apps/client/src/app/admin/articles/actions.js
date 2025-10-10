// apps/client/src/app/admin/articles/actions.js
'use server'

import { updateArticle, deleteArticle } from '@headlines/data-access/next'
import { createAdminAction } from '@/lib/actions/createAdminAction'

// Wrap the core data-access functions with the action factory.
// The factory handles dbConnect(), revalidation, and error handling.
export const updateArticleAction = createAdminAction(updateArticle, '/admin/articles')

export const deleteArticleAction = createAdminAction(deleteArticle, '/admin/articles')
