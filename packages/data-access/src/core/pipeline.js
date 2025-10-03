// packages/data-access/src/core/pipeline.js
import {
  Source,
  Article,
  SynthesizedEvent,
  Opportunity,
  WatchlistEntity,
  WatchlistSuggestion,
} from '@headlines/models'

export async function updateSourceAnalyticsBatch(bulkOps) {
  if (!bulkOps || bulkOps.length === 0) return { success: true, modifiedCount: 0 }
  try {
    const result = await Source.bulkWrite(bulkOps)
    return { success: true, modifiedCount: result.modifiedCount }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function findSourcesForScraping(queryCriteria) {
  try {
    const sources = await Source.find(queryCriteria).lean()
    return { success: true, data: JSON.parse(JSON.stringify(sources)) }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function performHousekeeping(deletionCriteria) {
  try {
    const result = await Article.deleteMany(deletionCriteria)
    return { success: true, deletedCount: result.deletedCount }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function bulkWriteEvents(eventOps) {
  if (!eventOps || eventOps.length === 0)
    return { success: true, upsertedCount: 0, modifiedCount: 0 }
  try {
    const result = await SynthesizedEvent.bulkWrite(eventOps, { ordered: false })
    return {
      success: true,
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function bulkWriteArticles(articleOps) {
  if (!articleOps || articleOps.length === 0) return { success: true, result: null }
  try {
    const result = await Article.bulkWrite(articleOps, { ordered: false })
    return { success: true, result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function findEventsByKeys(eventKeys) {
  try {
    const events = await SynthesizedEvent.find({ event_key: { $in: eventKeys } }).lean()
    return { success: true, data: JSON.parse(JSON.stringify(events)) }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function findArticlesByLinks(links) {
  try {
    const articles = await Article.find({ link: { $in: links } })
      .select('link _id')
      .lean()
    return { success: true, data: JSON.parse(JSON.stringify(articles)) }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getActiveWatchlistEntityNames() {
  try {
    const entities = await WatchlistEntity.find({}).select('name').lean()
    return { success: true, data: entities }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function bulkWriteWatchlistSuggestions(bulkOps) {
  if (!bulkOps || bulkOps.length === 0) return { success: true, result: null }
  try {
    const result = await WatchlistSuggestion.bulkWrite(bulkOps)
    return { success: true, result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
