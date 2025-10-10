// apps/client/src/app/admin/watchlist/actions.js
'use server'

import { createAdminAction } from '@/lib/actions/createAdminAction'
import {
  createWatchlistEntity,
  updateWatchlistEntity,
  deleteWatchlistEntity,
  processWatchlistSuggestion,
  updateWatchlistSuggestion,
} from '@headlines/data-access/next'
import { watchlistEntitySchema } from '@headlines/models/schemas'

export const createEntityAction = createAdminAction(async (entityData) => {
  const validation = watchlistEntitySchema.safeParse(entityData)
  if (!validation.success) {
    return { success: false, error: 'Invalid data.', details: validation.error.flatten() }
  }
  return createWatchlistEntity(validation.data)
}, '/admin/watchlist')

export const updateEntityAction = createAdminAction(async (entityId, updateData) => {
  const validation = watchlistEntitySchema.partial().safeParse(updateData)
  if (!validation.success) {
    return { success: false, error: 'Invalid data.', details: validation.error.flatten() }
  }
  return updateWatchlistEntity(entityId, validation.data)
}, '/admin/watchlist')

export const deleteEntityAction = createAdminAction(
  deleteWatchlistEntity,
  '/admin/watchlist'
)

export const processSuggestionAction = createAdminAction(
  processWatchlistSuggestion,
  '/admin/watchlist'
)

export const updateSuggestionAction = createAdminAction(
  updateWatchlistSuggestion,
  '/admin/watchlist'
)
