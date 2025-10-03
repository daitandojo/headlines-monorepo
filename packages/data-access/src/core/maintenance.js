// packages/data-access/src/core/maintenance.js
import {
  Article,
  SynthesizedEvent,
  Opportunity,
  RunVerdict,
  Source,
} from '@headlines/models'

/**
 * Deletes all documents from key collections that were created after a specific cutoff date.
 * @param {Date} cutoffDate - The date after which documents will be deleted.
 * @returns {Promise<object>} An object with counts of deleted documents per model.
 */
export async function deleteAllSince(cutoffDate) {
  const query = { createdAt: { $gte: cutoffDate } }
  const modelsToDelete = {
    Article,
    SynthesizedEvent,
    Opportunity,
    RunVerdict,
  }

  const deletionPromises = Object.entries(modelsToDelete).map(
    async ([modelName, model]) => {
      const { deletedCount } = await model.deleteMany(query)
      return { modelName, deletedCount }
    }
  )

  const results = await Promise.all(deletionPromises)
  const summary = results.reduce((acc, { modelName, deletedCount }) => {
    acc[modelName] = deletedCount
    return acc
  }, {})

  return { success: true, summary }
}

/**
 * Resets all analytics fields for every Source document to their default zero values.
 * @returns {Promise<object>} An object containing the count of modified documents.
 */
export async function resetAllSourceAnalytics() {
  const result = await Source.updateMany(
    {},
    {
      $set: {
        'analytics.totalRuns': 0,
        'analytics.totalSuccesses': 0,
        'analytics.totalFailures': 0,
        'analytics.totalScraped': 0,
        'analytics.totalRelevant': 0,
        'analytics.lastRunHeadlineCount': 0,
        'analytics.lastRunRelevantCount': 0,
        'analytics.lastRunContentSuccess': false,
      },
    }
  )
  return { success: true, modifiedCount: result.modifiedCount }
}

/**
 * Resets the `emailed` status to false for all events created after a specific cutoff date.
 * @param {Date} cutoffDate - The date to filter events from.
 * @returns {Promise<object>} An object containing the count of matched and modified documents.
 */
export async function resetEventsEmailedStatusSince(cutoffDate) {
  const result = await SynthesizedEvent.updateMany(
    { createdAt: { $gte: cutoffDate } },
    { $set: { emailed: false } }
  )
  return {
    success: true,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  }
}
