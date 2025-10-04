// packages/data-access/src/next.js (DEFINITIVE FIX - No HOC)
import 'server-only'
import dbConnect from './dbConnect.next.js'
import * as core from './core/index.js'
import { revalidatePath } from './revalidate.js'
import { buildQuery } from './queryBuilder.js'

// --- Explicit Wrappers for Each Core Function ---

// A helper to avoid rewriting the same pattern repeatedly
const wrap =
  (fn) =>
  async (...args) => {
    await dbConnect()
    return fn(...args)
  }

// Wrap each function individually
export const createSubscriber = wrap(core.createSubscriber)
export const updateSubscriber = wrap(core.updateSubscriber)
export const deleteSubscriber = wrap(core.deleteSubscriber)
export const createCountry = wrap(core.createCountry)
export const updateCountry = wrap(core.updateCountry)
export const createSource = wrap(core.createSource)
export const updateSource = wrap(core.updateSource)
export const getAllCountries = wrap(core.getAllCountries)
export const findSubscribers = wrap(core.findSubscribers)
export const getAllSubscribers = wrap(core.getAllSubscribers)
export const getAllSources = wrap(core.getAllSources)
export const getAllWatchlistEntities = wrap(core.getAllWatchlistEntities)
export const getSuggestions = wrap(core.getSuggestions)
export const getArticles = wrap(core.getArticles)
export const findArticles = wrap(core.findArticles)
export const updateArticles = wrap(core.updateArticles)
export const getTotalArticleCount = wrap(core.getTotalArticleCount)
export const updateArticle = wrap(core.updateArticle)
export const deleteArticle = wrap(core.deleteArticle)
export const getArticleDetails = wrap(core.getArticleDetails)
export const createSubscriberWithPassword = wrap(core.createSubscriberWithPassword)
export const updateSubscriberPassword = wrap(core.updateSubscriberPassword)
export const loginUser = wrap(core.loginUser)
export const generateChatTitle = wrap(core.generateChatTitle)
export const getDashboardStats = wrap(core.getDashboardStats)
export const getDistinctCountries = wrap(core.getDistinctCountries)
export const getGlobalCountries = wrap(core.getGlobalCountries)
export const getPublicTickerEvents = wrap(core.getPublicTickerEvents)
export const getEvents = wrap(core.getEvents)
export const findEvents = wrap(core.findEvents)
export const updateEvents = wrap(core.updateEvents)
export const getEventDetails = wrap(core.getEventDetails)
export const updateEvent = wrap(core.updateEvent)
export const deleteEvent = wrap(core.deleteEvent)
export const getTotalEventCount = wrap(core.getTotalEventCount)
export const generateExport = wrap(core.generateExport)
export const getDistinctOpportunityFields = wrap(core.getDistinctOpportunityFields)
export const updateOpportunities = wrap(core.updateOpportunities)
export const getTotalOpportunitiesCount = wrap(core.getTotalOpportunitiesCount)
export const getOpportunities = wrap(core.getOpportunities)
export const getOpportunityDetails = wrap(core.getOpportunityDetails)
export const updateOpportunity = wrap(core.updateOpportunity)
export const deleteOpportunity = wrap(core.deleteOpportunity)
export const updateSourceAnalyticsBatch = wrap(core.updateSourceAnalyticsBatch)
export const findSourcesForScraping = wrap(core.findSourcesForScraping)
export const performHousekeeping = wrap(core.performHousekeeping)
export const bulkWriteEvents = wrap(core.bulkWriteEvents)
export const bulkWriteArticles = wrap(core.bulkWriteArticles)
export const findEventsByKeys = wrap(core.findEventsByKeys)
export const findArticlesByLinks = wrap(core.findArticlesByLinks)
export const getActiveWatchlistEntityNames = wrap(core.getActiveWatchlistEntityNames)
export const bulkWriteWatchlistSuggestions = wrap(core.bulkWriteWatchlistSuggestions)
export const linkOpportunityToEvent = wrap(core.linkOpportunityToEvent)
export const unlinkOpportunityFromEvent = wrap(core.unlinkOpportunityFromEvent)
export const getSettings = wrap(core.getSettings)
export const upsertSubscriber = wrap(core.upsertSubscriber)
export const getAllPushSubscriptions = wrap(core.getAllPushSubscriptions)
export const deletePushSubscription = wrap(core.deletePushSubscription)
export const getCurrentSubscriber = wrap(core.getCurrentSubscriber)
export const savePushSubscription = wrap(core.savePushSubscription)
export const updateUserProfile = wrap(core.updateUserProfile)
export const updateUserInteraction = wrap(core.updateUserInteraction)
export const processUploadedArticle = wrap(core.processUploadedArticle)
export const clearDiscardedItems = wrap(core.clearDiscardedItems)
export const getRecentRunVerdicts = wrap(core.getRecentRunVerdicts)
export const getRunVerdictById = wrap(core.getRunVerdictById)
export const findWatchlistEntities = wrap(core.findWatchlistEntities)
export const updateWatchlistEntities = wrap(core.updateWatchlistEntities)
export const createWatchlistEntity = wrap(core.createWatchlistEntity)
export const updateWatchlistEntity = wrap(core.updateWatchlistEntity)
export const deleteWatchlistEntity = wrap(core.deleteWatchlistEntity)
export const updateWatchlistSuggestion = wrap(core.updateWatchlistSuggestion)
export const processWatchlistSuggestion = wrap(core.processWatchlistSuggestion)
export const deleteAllSince = wrap(core.deleteAllSince)
export const resetAllSourceAnalytics = wrap(core.resetAllSourceAnalytics)
export const resetEventsEmailedStatusSince = wrap(core.resetEventsEmailedStatusSince)

// Special wrapper for updateSettings to include revalidation
export const updateSettings = async (...args) => {
  await dbConnect()
  const result = await core.updateSettings(...args)
  if (result.success) {
    await revalidatePath('/admin/settings')
  }
  return result
}

// Export non-wrapped utilities
export { buildQuery, revalidatePath }
