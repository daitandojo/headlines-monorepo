// File: packages/models/src/client.js (version 1.0 - New File)
'use client'

// This file is the designated "client-safe" entry point for the models package.
// It ONLY exports constants and contains NO server-side code (like Mongoose).
import * as constants from './prompt-constants.js'

export const {
  ENTITY_TYPES,
  ENTITY_STATUSES,
  SOURCE_STATUSES,
  SOURCE_FREQUENCIES,
  EXTRACTION_METHODS,
  ARTICLE_STATUSES,
  SUGGESTION_STATUSES,
  WATCHLIST_SUGGESTION_STATUSES,
  SUBSCRIBER_ROLES,
  SUBSCRIPTION_TIERS,
} = constants
