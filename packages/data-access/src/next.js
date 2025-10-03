// packages/data-access/src/next.js (Next.js Entry Point)
import 'server-only'
import dbConnect from './dbConnect.next.js'
import * as core from './core/index.js'

function withDbConnect(fn) {
  return async (...args) => {
    await dbConnect()
    return fn(...args)
  }
}

export const createSubscriber = withDbConnect(core.createSubscriber)
export const updateSubscriber = withDbConnect(core.updateSubscriber)
export const deleteSubscriber = withDbConnect(core.deleteSubscriber)
export const createCountry = withDbConnect(core.createCountry)
export const updateCountry = withDbConnect(core.updateCountry)
export const createSource = withDbConnect(core.createSource)
export const updateSource = withDbConnect(core.updateSource)
export const getAllCountries = withDbConnect(core.getAllCountries)
export const findSubscribers = withDbConnect(core.findSubscribers)
export const getAllSubscribers = withDbConnect(core.getAllSubscribers)
export const getAllSources = withDbConnect(core.getAllSources)
export const getAllWatchlistEntities = withDbConnect(core.getAllWatchlistEntities)
export const getSuggestions = withDbConnect(core.getSuggestions)
export const getArticles = withDbConnect(core.getArticles)
export const findArticles = withDbConnect(core.findArticles)
export const updateArticles = withDbConnect(core.updateArticles)
export const getTotalArticleCount = withDbConnect(core.getTotalArticleCount)
export const updateArticle = withDbConnect(core.updateArticle)
export const deleteArticle = withDbConnect(core.deleteArticle)
export const getArticleDetails = withDbConnect(core.getArticleDetails)
export const createSubscriberWithPassword = withDbConnect(
  core.createSubscriberWithPassword
)
export const updateSubscriberPassword = withDbConnect(core.updateSubscriberPassword)
export const loginUser = withDbConnect(core.loginUser)
export const generateChatTitle = withDbConnect(core.generateChatTitle)
export const getDashboardStats = withDbConnect(core.getDashboardStats)
export const getGlobalCountries = withDbConnect(core.getGlobalCountries)
export const getEvents = withDbConnect(core.getEvents)
export const findEvents = withDbConnect(core.findEvents)
export const updateEvents = withDbConnect(core.updateEvents)
export const getEventDetails = withDbConnect(core.getEventDetails)
export const updateEvent = withDbConnect(core.updateEvent)
export const deleteEvent = withDbConnect(core.deleteEvent)
export const getTotalEventCount = withDbConnect(core.getTotalEventCount)
export const generateExport = withDbConnect(core.generateExport)
export const getDistinctOpportunityFields = withDbConnect(
  core.getDistinctOpportunityFields
)
export const updateOpportunities = withDbConnect(core.updateOpportunities)
export const getTotalOpportunitiesCount = withDbConnect(core.getTotalOpportunitiesCount)
export const getOpportunities = withDbConnect(core.getOpportunities)
export const getOpportunityDetails = withDbConnect(core.getOpportunityDetails)
export const updateOpportunity = withDbConnect(core.updateOpportunity)
export const deleteOpportunity = withDbConnect(core.deleteOpportunity)
export const updateSourceAnalyticsBatch = withDbConnect(core.updateSourceAnalyticsBatch)
export const findSourcesForScraping = withDbConnect(core.findSourcesForScraping)
export const performHousekeeping = withDbConnect(core.performHousekeeping)
export const bulkWriteEvents = withDbConnect(core.bulkWriteEvents)
export const bulkWriteArticles = withDbConnect(core.bulkWriteArticles)
export const findEventsByKeys = withDbConnect(core.findEventsByKeys)
export const findArticlesByLinks = withDbConnect(core.findArticlesByLinks)
export const getActiveWatchlistEntityNames = withDbConnect(
  core.getActiveWatchlistEntityNames
)
export const bulkWriteWatchlistSuggestions = withDbConnect(
  core.bulkWriteWatchlistSuggestions
)
export const linkOpportunityToEvent = withDbConnect(core.linkOpportunityToEvent)
export const unlinkOpportunityFromEvent = withDbConnect(core.unlinkOpportunityFromEvent)
export const getSettings = withDbConnect(core.getSettings)
export const updateSettings = withDbConnect(core.updateSettings)
export const upsertSubscriber = withDbConnect(core.upsertSubscriber)
export const getAllPushSubscriptions = withDbConnect(core.getAllPushSubscriptions)
export const deletePushSubscription = withDbConnect(core.deletePushSubscription)
export const getCurrentSubscriber = withDbConnect(core.getCurrentSubscriber)
export const savePushSubscription = withDbConnect(core.savePushSubscription)
export const updateUserProfile = withDbConnect(core.updateUserProfile)
export const updateUserInteraction = withDbConnect(core.updateUserInteraction)
export const processUploadedArticle = withDbConnect(core.processUploadedArticle)
export const clearDiscardedItems = withDbConnect(core.clearDiscardedItems)
export const getRecentRunVerdicts = withDbConnect(core.getRecentRunVerdicts)
export const getRunVerdictById = withDbConnect(core.getRunVerdictById)
export const findWatchlistEntities = withDbConnect(core.findWatchlistEntities)
export const updateWatchlistEntities = withDbConnect(core.updateWatchlistEntities)
export const createWatchlistEntity = withDbConnect(core.createWatchlistEntity)
export const updateWatchlistEntity = withDbConnect(core.updateWatchlistEntity)
export const deleteWatchlistEntity = withDbConnect(core.deleteWatchlistEntity)
export const updateWatchlistSuggestion = withDbConnect(core.updateWatchlistSuggestion)
export const processWatchlistSuggestion = withDbConnect(core.processWatchlistSuggestion)
export const deleteAllSince = withDbConnect(core.deleteAllSince)
export const resetAllSourceAnalytics = withDbConnect(core.resetAllSourceAnalytics)
export const resetEventsEmailedStatusSince = withDbConnect(
  core.resetEventsEmailedStatusSince
)

export { buildQuery } from './queryBuilder.js'
export { revalidatePath } from './revalidate.js'
