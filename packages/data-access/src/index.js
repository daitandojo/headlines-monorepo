// packages/data-access/src/index.js (version 5.2.0)
'use server'

import {
  getAdminArticles,
  updateAdminArticle,
  deleteAdminArticle,
} from './actions/adminArticles.js'
import {
  getAdminEvents,
  getAdminEventDetails,
  updateAdminEvent,
  deleteAdminEvent,
} from './actions/adminEvents.js'
import {
  getAdminOpportunities,
  updateAdminOpportunity,
  deleteAdminOpportunity,
} from './actions/adminOpportunities.js'
import { deleteArticle, getArticles, getTotalArticleCount } from './actions/articles.js'
import { deleteEvent, getEvents, getTotalEventCount } from './actions/events.js'
import {
  getOpportunities,
  getTotalOpportunitiesCount,
  deleteOpportunity,
  getOpportunityDetails,
  getUniqueOpportunityCountries,
} from './actions/opportunities.js'

import { sendItemByEmail } from './actions/email.js';
import { 
  exportOpportunitiesToCSV, 
  exportOpportunitiesToXLSX, 
  exportUsersToCSV, 
  exportUsersToXLSX, 
  exportEventsToCSV, 
  exportEventsToXLSX, 
  exportArticlesToCSV, 
  exportArticlesToXLSX 
} from './actions/export.js';
import { linkOpportunityToEvent, unlinkOpportunityFromEvent } from './actions/relationships.js';
import { clearDiscardedItems } from './actions/userSettings.js';
import { updateUserProfile, updateUserInteraction, updateUserFilterPreference } from './actions/subscriber.js'
import {
  getAllCountries,
  createCountry,
  updateCountry,
  getGlobalCountries,
} from './actions/countries.js'
import {
  getAllSubscribers,
  createSubscriber,
  updateSubscriber,
  deleteSubscriber,
  updateSubscribersStatus,
  deleteSubscribers,
} from './actions/admin.js'
import {
  getAllSources,
  createSource,
  updateSource,
  deleteSource,
} from './actions/adminSources.js'
import { getDashboardStats } from './actions/dashboard.js'
import { getRecentRunVerdicts, getRunVerdictById } from './actions/verdicts.js'
import {
  getSuggestions,
  processWatchlistSuggestion,
  processSourceSuggestion,
  updateWatchlistSuggestion,
} from './actions/suggestions.js'
import {
  getAllWatchlistEntities,
  createWatchlistEntity,
  updateWatchlistEntity,
  deleteWatchlistEntity,
} from './actions/watchlist.js'
import { getSettings, updateSettings } from './actions/settings.js'
import { testSourceConfig } from './actions/scrape.js'
import {
  updateSourceAnalyticsBatch,
  findSourcesForScraping,
  performHousekeeping,
  bulkWriteEvents,
  bulkWriteArticles,
  findEventsByKeys,
  findArticlesByLinks,
  getActiveWatchlistEntityNames,
  bulkWriteWatchlistSuggestions,
} from './actions/pipeline.js'
import { generateChatTitle } from './actions/chat.js';
import { suggestSections, suggestSelector } from './actions/aiSourceDiscovery.js';

export {
  getAdminArticles, updateAdminArticle, deleteAdminArticle,
  getAdminEvents, getAdminEventDetails, updateAdminEvent, deleteAdminEvent,
  getAdminOpportunities, updateAdminOpportunity, deleteAdminOpportunity,
  deleteArticle, getArticles, getTotalArticleCount,
  deleteEvent, getEvents, getTotalEventCount,
  getOpportunities, getTotalOpportunitiesCount, deleteOpportunity, getOpportunityDetails, getUniqueOpportunityCountries,
  sendItemByEmail,
  exportOpportunitiesToCSV, exportOpportunitiesToXLSX, exportUsersToCSV, exportUsersToXLSX, exportEventsToCSV, exportEventsToXLSX, exportArticlesToCSV, exportArticlesToXLSX,
  linkOpportunityToEvent, unlinkOpportunityFromEvent,
  clearDiscardedItems,
  updateUserProfile, updateUserInteraction, updateUserFilterPreference,
  getAllCountries, createCountry, updateCountry, getGlobalCountries,
  getAllSubscribers, createSubscriber, updateSubscriber, deleteSubscriber, updateSubscribersStatus, deleteSubscribers,
  getAllSources, createSource, updateSource, deleteSource,
  getDashboardStats,
  getRecentRunVerdicts, getRunVerdictById,
  getSuggestions, processWatchlistSuggestion, processSourceSuggestion, updateWatchlistSuggestion,
  getAllWatchlistEntities, createWatchlistEntity, updateWatchlistEntity, deleteWatchlistEntity,
  getSettings, updateSettings,
  testSourceConfig,
  updateSourceAnalyticsBatch, findSourcesForScraping, performHousekeeping, bulkWriteEvents, bulkWriteArticles, findEventsByKeys, findArticlesByLinks, getActiveWatchlistEntityNames, bulkWriteWatchlistSuggestions,
  generateChatTitle,
  suggestSections,
  suggestSelector
}
