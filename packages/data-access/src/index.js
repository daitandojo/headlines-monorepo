// packages/data-access/src/index.js
import { env } from '@headlines/config/node'
import dbConnectCore from './dbConnect.js'
import * as core from './core/index.js'
import { buildQuery } from './queryBuilder.js'

function dbConnect() {
  return dbConnectCore(env.MONGO_URI)
}

function withDbConnect(fn) {
  return async (...args) => {
    await dbConnect()
    return fn(...args)
  }
}

// Wrap and export all core functions for Node.js environment
const nodeExports = {}
for (const key in core) {
  if (typeof core[key] === 'function') {
    nodeExports[key] = withDbConnect(core[key])
  }
}

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
  getGlobalCountries,
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
} = nodeExports

export { buildQuery }
