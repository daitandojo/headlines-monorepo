// packages/data-access/src/actions/watchlist.js (version 1.1.0)
'use server'

import { revalidatePath } from '../revalidate.js'
import { WatchlistEntity, Article } from '../../../models/src/index.js'
import { verifyAdmin } from '../../../auth/src/index.js'
import dbConnect from '../dbConnect.js'

export async function getAllWatchlistEntities() {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    const entities = await WatchlistEntity.find({}).sort({ name: 1 }).lean()
    return { success: true, data: JSON.parse(JSON.stringify(entities)) }
  } catch (e) {
    return { success: false, error: 'Failed to fetch watchlist.' }
  }
}

export async function createWatchlistEntity(entityData) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    const newEntity = new WatchlistEntity(entityData)
    await newEntity.save()
    await revalidatePath('/admin/watchlist')
    return { success: true, data: JSON.parse(JSON.stringify(newEntity)) }
  } catch (e) {
    if (e.code === 11000) return { success: false, error: 'An entity with this name already exists.' }
    return { success: false, error: 'Failed to create entity.' }
  }
}

export async function updateWatchlistEntity(entityId, updateData) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()

    // If searchTerms are being updated, recalculate the hitCount.
    if (updateData.searchTerms && Array.isArray(updateData.searchTerms)) {
      // Sanitize and unique the terms
      updateData.searchTerms = [...new Set(updateData.searchTerms.map(t => t.toLowerCase().trim()).filter(Boolean))];
      
      const entity = await WatchlistEntity.findById(entityId).select('name').lean();
      const allTerms = [entity.name, ...updateData.searchTerms].map(t => t.toLowerCase().trim()).filter(Boolean);
      const uniqueTerms = [...new Set(allTerms)];

      if (uniqueTerms.length > 0) {
        const termRegexes = uniqueTerms.map(term => new RegExp(`\\b${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i'));
        const newHitCount = await Article.countDocuments({ headline: { $in: termRegexes } });
        updateData.hitCount = newHitCount;
      } else {
        updateData.hitCount = 0;
      }
    }
    
    const entity = await WatchlistEntity.findByIdAndUpdate(entityId, { $set: updateData }, { new: true }).lean()
    if (!entity) return { success: false, error: 'Entity not found.' }
    
    await revalidatePath('/admin/watchlist')
    return { success: true, data: JSON.parse(JSON.stringify(entity)) }
  } catch (e) {
    return { success: false, error: 'Failed to update entity.' }
  }
}

export async function deleteWatchlistEntity(entityId) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    const result = await WatchlistEntity.findByIdAndDelete(entityId)
    if (!result) return { success: false, error: 'Entity not found.' }
    await revalidatePath('/admin/watchlist')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to delete entity.' }
  }
}
