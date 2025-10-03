// apps/client/src/app/admin/watchlist/actions.js
'use server'

import { revalidatePath } from 'next/cache'
import dbConnect from '@headlines/data-access/dbConnect/next'
import {
  createWatchlistEntity,
  updateWatchlistEntity,
  deleteWatchlistEntity,
  processWatchlistSuggestion,
  updateWatchlistSuggestion,
} from '@headlines/data-access'
import { watchlistEntitySchema } from '@headlines/models/schemas'

export async function createEntityAction(entityData) {
  const validation = watchlistEntitySchema.safeParse(entityData)
  if (!validation.success) {
    return { success: false, error: 'Invalid data.', details: validation.error.flatten() }
  }

  await dbConnect()
  const result = await createWatchlistEntity(validation.data)
  if (result.success) {
    revalidatePath('/admin/watchlist')
  }
  return result
}

export async function updateEntityAction(entityId, updateData) {
  const validation = watchlistEntitySchema.partial().safeParse(updateData)
  if (!validation.success) {
    return { success: false, error: 'Invalid data.', details: validation.error.flatten() }
  }

  await dbConnect()
  const result = await updateWatchlistEntity(entityId, validation.data)
  if (result.success) {
    revalidatePath('/admin/watchlist')
  }
  return result
}

export async function deleteEntityAction(entityId) {
  await dbConnect()
  const result = await deleteWatchlistEntity(entityId)
  if (result.success) {
    revalidatePath('/admin/watchlist')
  }
  return result
}

export async function processSuggestionAction(suggestionId, action) {
  await dbConnect()
  const result = await processWatchlistSuggestion({ suggestionId, action })
  if (result.success) {
    revalidatePath('/admin/watchlist')
  }
  return result
}

export async function updateSuggestionAction(suggestionId, updateData) {
  await dbConnect()
  const result = await updateWatchlistSuggestion(suggestionId, updateData)
  if (result.success) {
    revalidatePath('/admin/watchlist')
  }
  return result
}
