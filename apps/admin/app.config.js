// apps/admin/app.config.js (version 3.0.0)
// This file provides the minimal configuration needed by the shared
// scraper-logic package when it's used by the admin app's API routes.

export const CONCURRENCY_LIMIT = 2 // Lower limit for admin app tests

// We provide the OPENAI_API_KEY directly from the process environment
// The validation will be handled by initializeSharedLogic before these are used.
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const LLM_MODEL_UTILITY = process.env.LLM_MODEL_UTILITY || 'gpt-5-nano'
