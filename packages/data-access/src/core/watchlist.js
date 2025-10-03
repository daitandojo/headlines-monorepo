// packages/data-access/src/core/watchlist.js
import { WatchlistEntity, Article, WatchlistSuggestion } from '@headlines/models'

export async function findWatchlistEntities(filter = {}, sort = { name: 1 }) {
  try {
    const entities = await WatchlistEntity.find(filter).sort(sort).lean()
    return { success: true, data: JSON.parse(JSON.stringify(entities)) }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updateWatchlistEntities(filter, update) {
  try {
    const result = await WatchlistEntity.updateMany(filter, update)
    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createWatchlistEntity(entityData) {
  try {
    const newEntity = new WatchlistEntity(entityData)
    await newEntity.save()
    return { success: true, entity: JSON.parse(JSON.stringify(newEntity)) }
  } catch (e) {
    if (e.code === 11000)
      return { success: false, error: 'An entity with this name already exists.' }
    return { success: false, error: 'Failed to create entity.' }
  }
}

export async function updateWatchlistEntity(entityId, updateData) {
  try {
    if (updateData.searchTerms && Array.isArray(updateData.searchTerms)) {
      updateData.searchTerms = [
        ...new Set(
          updateData.searchTerms.map((t) => t.toLowerCase().trim()).filter(Boolean)
        ),
      ]
      const entity = await WatchlistEntity.findById(entityId).select('name').lean()
      const allTerms = [entity.name, ...updateData.searchTerms]
        .map((t) => t.toLowerCase().trim())
        .filter(Boolean)
      const uniqueTerms = [...new Set(allTerms)]
      if (uniqueTerms.length > 0) {
        const termRegexes = uniqueTerms.map(
          (term) =>
            new RegExp(`\\b${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')
        )
        updateData.hitCount = await Article.countDocuments({
          headline: { $in: termRegexes },
        })
      } else {
        updateData.hitCount = 0
      }
    }
    const entity = await WatchlistEntity.findByIdAndUpdate(
      entityId,
      { $set: updateData },
      { new: true }
    ).lean()
    if (!entity) return { success: false, error: 'Entity not found.' }
    return { success: true, entity: JSON.parse(JSON.stringify(entity)) }
  } catch (e) {
    return { success: false, error: 'Failed to update entity.' }
  }
}

export async function deleteWatchlistEntity(entityId) {
  try {
    const result = await WatchlistEntity.findByIdAndDelete(entityId)
    if (!result) return { success: false, error: 'Entity not found.' }
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed to delete entity.' }
  }
}

export async function updateWatchlistSuggestion(suggestionId, updateData) {
  try {
    const suggestion = await WatchlistSuggestion.findByIdAndUpdate(
      suggestionId,
      { $set: updateData },
      { new: true }
    ).lean()
    if (!suggestion) return { success: false, error: 'Suggestion not found.' }
    return { success: true, data: JSON.parse(JSON.stringify(suggestion)) }
  } catch (e) {
    return { success: false, error: 'Failed to update suggestion.' }
  }
}

export async function processWatchlistSuggestion({ suggestionId, action }) {
  try {
    const suggestion = await WatchlistSuggestion.findById(suggestionId)
    if (!suggestion) return { success: false, error: 'Suggestion not found.' }
    suggestion.status = action
    await suggestion.save()
    if (action === 'approved') {
      await WatchlistEntity.updateOne(
        { name: suggestion.name },
        {
          $setOnInsert: {
            name: suggestion.name,
            type: suggestion.type,
            country: suggestion.country,
            context: suggestion.rationale,
            searchTerms: suggestion.searchTerms,
            status: 'active',
          },
        },
        { upsert: true }
      )
    }
    return {
      success: true,
      message: `Watchlist suggestion for "${suggestion.name}" was ${action}.`,
    }
  } catch (e) {
    return { success: false, error: 'Failed to process suggestion.' }
  }
}
