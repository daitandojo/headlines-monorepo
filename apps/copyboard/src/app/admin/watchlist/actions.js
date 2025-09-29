'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@headlines/data-access/dbConnect.js';
import {
  createWatchlistEntity,
  updateWatchlistEntity,
  deleteWatchlistEntity,
  processWatchlistSuggestion,
  updateWatchlistSuggestion,
} from '@headlines/data-access';

export async function createEntityAction(entityData) {
  await dbConnect();
  const result = await createWatchlistEntity(entityData);
  if (result.success) {
    revalidatePath('/admin/watchlist');
  }
  return result;
}

export async function updateEntityAction(entityId, updateData) {
  await dbConnect();
  const result = await updateWatchlistEntity(entityId, updateData);
  if (result.success) {
    revalidatePath('/admin/watchlist');
  }
  return result;
}

export async function deleteEntityAction(entityId) {
  await dbConnect();
  const result = await deleteWatchlistEntity(entityId);
  if (result.success) {
    revalidatePath('/admin/watchlist');
  }
  return result;
}

export async function processSuggestionAction(suggestionId, action) {
  await dbConnect();
  const result = await processWatchlistSuggestion({ suggestionId, action, suggestionType: 'watchlist' });
  if (result.success) {
    revalidatePath('/admin/watchlist');
  }
  return result;
}

export async function updateSuggestionAction(suggestionId, updateData) {
  await dbConnect();
  const result = await updateWatchlistSuggestion(suggestionId, updateData);
  if (result.success) {
    revalidatePath('/admin/watchlist');
  }
  return result;
}