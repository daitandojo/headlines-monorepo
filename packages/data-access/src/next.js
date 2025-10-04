// packages/data-access/src/next.js (CORRECTED)
import 'server-only'
import { env } from '@headlines/config/next'
import dbConnect from './dbConnect.next.js' // DEFINITIVE FIX: Import the Next.js-specific connector
import * as core from './core/index.js'
import { buildQuery } from './queryBuilder.js'
import { revalidatePath } from './revalidate.js'

// This function is no longer needed here, as the wrapper will use the imported dbConnect
// function dbConnect() {
//   return dbConnectCore(env.MONGO_URI)
// }

function withDbConnect(fn) {
  return async (...args) => {
    await dbConnect() // This now correctly calls the Next.js-specific dbConnect
    return fn(...args)
  }
}

// Wrap all core functions
const wrappedCore = {}
for (const key in core) {
  if (typeof core[key] === 'function') {
    wrappedCore[key] = withDbConnect(core[key])
  }
}

const originalUpdateSettings = wrappedCore.updateSettings
wrappedCore.updateSettings = async (...args) => {
  const result = await originalUpdateSettings(...args)
  if (result.success) {
    await revalidatePath('/admin/settings')
  }
  return result
}

// Explicitly export everything to avoid issues with module systems
export const {
  createSubscriber,
  updateSubscriber,
  deleteSubscriber,
  createCountry,
  updateCountry,
  createSource,
  updateSource,
  getAllCountries,
  findSubscribers,
  getAllSubscribers,
  getAllSources,
  getAllWatchlistEntities,
  getSuggestions,
  getArticles,
  findArticles,
  updateArticles,
  getTotalArticleCount,
  updateArticle,
  deleteArticle,
  getArticleDetails,
  createSubscriberWithPassword,
  updateSubscriberPassword,
  loginUser,
  generateChatTitle,
  getDashboardStats,
  getDistinctCountries,
  getGlobalCountries,
  getPublicTickerEvents,
  getEvents,
  findEvents,
  updateEvents,
  getEventDetails,
  updateEvent,
  deleteEvent,
  getTotalEventCount,
  generateExport,
  getDistinctOpportunityFields,
  updateOpportunities,
  getTotalOpportunitiesCount,
  getOpportunities,
  getOpportunityDetails,
  updateOpportunity,
  deleteOpportunity,
  updateSourceAnalyticsBatch,
  findSourcesForScraping,
  performHousekeeping,
  bulkWriteEvents,
  bulkWriteArticles,
  findEventsByKeys,
  findArticlesByLinks,
  getActiveWatchlistEntityNames,
  bulkWriteWatchlistSuggestions,
  linkOpportunityToEvent,
  unlinkOpportunityFromEvent,
  getSettings,
  updateSettings,
  upsertSubscriber,
  getAllPushSubscriptions,
  deletePushSubscription,
  getCurrentSubscriber,
  savePushSubscription,
  updateUserProfile,
  updateUserInteraction,
  processUploadedArticle,
  clearDiscardedItems,
  getRecentRunVerdicts,
  getRunVerdictById,
  findWatchlistEntities,
  updateWatchlistEntities,
  createWatchlistEntity,
  updateWatchlistEntity,
  deleteWatchlistEntity,
  updateWatchlistSuggestion,
  processWatchlistSuggestion,
  deleteAllSince,
  resetAllSourceAnalytics,
  resetEventsEmailedStatusSince,
} = wrappedCore

export { buildQuery, revalidatePath }
