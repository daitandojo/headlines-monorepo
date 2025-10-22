// packages/data-access/src/next.js
import 'server-only'
import dbConnect from './dbConnect.next.js'
import * as core from './core/index.js'
import { revalidatePath } from './revalidate.js'
import { buildQuery } from './queryBuilder.js'
import * as aiServices from '@headlines/ai-services/next'

console.log('🔵 LOADING: data-access/next.js')

/**
 * IMPORTANT: The wrap() function is ONLY used for Server Actions and
 * Server Components that call these functions directly.
 *
 * API route handlers already call dbConnect() in their middleware,
 * so functions called from API routes should NOT be wrapped.
 *
 * However, Next.js Server Actions and Server Components DO need
 * the wrapper since they don't go through the API handler middleware.
 */
const wrap =
  (fn) =>
  async (...args) => {
    await dbConnect()
    return fn(...args)
  }

// --- AI Services (wrapped for Server Actions/Components) ---
export const generateChatTitle = wrap(aiServices.generateChatTitle)
export const addKnowledge = wrap(aiServices.addKnowledge)
export const suggestSections = wrap(aiServices.suggestSections)

export const processUploadedArticle = async (...args) => {
  await dbConnect()
  const result = await aiServices.processUploadedArticle(...args)
  if (result.success) {
    revalidatePath('/events')
    revalidatePath('/opportunities')
  }
  return result
}

// --- Data Access Functions ---
// These are NOT wrapped because they're called from API handlers that already connect
// If you call these from Server Actions/Components, use the *Action versions below
export const createSubscriber = core.createSubscriber
export const updateSubscriber = core.updateSubscriber
export const deleteSubscriber = core.deleteSubscriber
export const createCountry = core.createCountry
export const updateCountry = core.updateCountry
export const createSource = core.createSource
export const updateSource = core.updateSource
export const getAllCountries = core.getAllCountries
export const findSubscribers = core.findSubscribers
export const getAllSubscribers = core.getAllSubscribers
export const getAllSources = core.getAllSources
export const getAllWatchlistEntities = core.getAllWatchlistEntities
export const getSuggestions = core.getSuggestions
export const getArticles = core.getArticles
export const findArticles = core.findArticles
export const updateArticles = core.updateArticles
export const getTotalArticleCount = core.getTotalArticleCount
export const updateArticle = core.updateArticle
export const deleteArticle = core.deleteArticle
export const getArticleDetails = core.getArticleDetails
export const createSubscriberWithPassword = core.createSubscriberWithPassword
export const updateSubscriberPassword = core.updateSubscriberPassword
export const loginUser = core.loginUser
export const getDashboardStats = core.getDashboardStats
export const getDistinctCountries = core.getDistinctCountries
export const getGlobalCountries = core.getGlobalCountries
export const getPublicTickerEvents = core.getPublicTickerEvents
export const getEvents = core.getEvents
export const findEvents = core.findEvents
export const updateEvents = core.updateEvents
export const getEventDetails = core.getEventDetails
export const updateEvent = core.updateEvent
export const deleteEvent = core.deleteEvent
export const getTotalEventCount = core.getTotalEventCount
export const generateExport = core.generateExport
export const getDistinctOpportunityFields = core.getDistinctOpportunityFields
export const updateOpportunities = core.updateOpportunities
export const getTotalOpportunitiesCount = core.getTotalOpportunitiesCount
export const getOpportunities = core.getOpportunities
export const getOpportunityDetails = core.getOpportunityDetails
export const updateOpportunity = core.updateOpportunity
export const deleteOpportunity = core.deleteOpportunity
export const updateSourceAnalyticsBatch = core.updateSourceAnalyticsBatch
export const findSourcesForScraping = core.findSourcesForScraping
export const performHousekeeping = core.performHousekeeping
export const bulkWriteEvents = core.bulkWriteEvents
export const bulkWriteArticles = core.bulkWriteArticles
export const findEventsByKeys = core.findEventsByKeys
export const findArticlesByLinks = core.findArticlesByLinks
export const getActiveWatchlistEntityNames = core.getActiveWatchlistEntityNames
export const bulkWriteWatchlistSuggestions = core.bulkWriteWatchlistSuggestions
export const linkOpportunityToEvent = core.linkOpportunityToEvent
export const unlinkOpportunityFromEvent = core.unlinkOpportunityFromEvent
export const getSettings = core.getSettings
export const upsertSubscriber = core.upsertSubscriber
export const getAllPushSubscriptions = core.getAllPushSubscriptions
export const deletePushSubscription = core.deletePushSubscription
export const getCurrentSubscriber = core.getCurrentSubscriber
export const savePushSubscription = core.savePushSubscription
export const updateUserProfile = core.updateUserProfile
export const updateUserInteraction = core.updateUserInteraction
export const clearDiscardedItems = core.clearDiscardedItems
export const getRecentRunVerdicts = core.getRecentRunVerdicts
export const getRunVerdictById = core.getRunVerdictById
export const findWatchlistEntities = core.findWatchlistEntities
export const updateWatchlistEntities = core.updateWatchlistEntities
export const createWatchlistEntity = core.createWatchlistEntity
export const updateWatchlistEntity = core.updateWatchlistEntity
export const deleteWatchlistEntity = core.deleteWatchlistEntity
export const updateWatchlistSuggestion = core.updateWatchlistSuggestion
export const processWatchlistSuggestion = core.processWatchlistSuggestion
export const deleteAllSince = core.deleteAllSince
export const resetAllSourceAnalytics = core.resetAllSourceAnalytics
export const resetEventsEmailedStatusSince = core.resetEventsEmailedStatusSince
export const sendItemByEmail = core.sendItemByEmail

// Special wrapper for updateSettings to include revalidation
export const updateSettings = async (...args) => {
  await dbConnect()
  const result = await core.updateSettings(...args)
  if (result.success) {
    await revalidatePath('/admin/settings')
  }
  return result
}

// --- Wrapped versions for Server Actions/Components ---
// If you need to call these from Server Actions or Server Components
// (not through API routes), use these versions instead:
export const getEventsAction = wrap(core.getEvents)
export const getArticlesAction = wrap(core.getArticles)
export const getTotalEventCountAction = wrap(core.getTotalEventCount)
export const getTotalArticleCountAction = wrap(core.getTotalArticleCount)
// Add more *Action versions as needed for Server Actions/Components

export { buildQuery, revalidatePath }
