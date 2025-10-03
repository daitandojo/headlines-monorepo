// packages/config/src/settings.js (version 2.0.0)
// ARCHITECTURAL REFACTORING: This file is now a "dumb" provider of default settings.
// It no longer contains any logic for fetching data from a database and has no
// dependency on @headlines/models. The application is now responsible for populating
// these settings at runtime.

const DEFAULTS = {
  HEADLINES_RELEVANCE_THRESHOLD: 25,
  ARTICLES_RELEVANCE_THRESHOLD: 45,
  EVENT_RELEVANCE_THRESHOLD: 50,
  MINIMUM_EVENT_AMOUNT_USD_MILLIONS: 20,
  HIGH_SIGNAL_HEADLINE_THRESHOLD: 90,
  AGENT_DISAGREEMENT_THRESHOLD: 50,
  SINGLETON_RELEVANCE_THRESHOLD: 85,
  HIGH_VALUE_DEAL_USD_MM: 50,
  SIGNIFICANT_PRIVATE_BENEFICIARY_USD_MM: 30,
  WATCHLIST_SCORE_BOOST: 35,
  SUGGESTION_GENERATION_THRESHOLD: 80,
  MIN_ARTICLE_CHARS: 100,
  LLM_MODEL_HEADLINE_ASSESSMENT: 'gpt-5-mini',
  LLM_MODEL_ARTICLE_ASSESSMENT: 'gpt-5-mini',
  LLM_MODEL_SYNTHESIS: 'gpt-5-mini',
  LLM_MODEL_UTILITY: 'gpt-5-nano',
}

export const settings = { ...DEFAULTS }

let isInitialized = false

/**
 * Populates the exported `settings` object with values from the database.
 * This function is intended to be called by the application layer at startup.
 * @param {Array<object>} dbSettings - An array of setting objects from the database.
 */
export function populateSettings(dbSettings) {
  if (isInitialized) return
  if (!dbSettings || dbSettings.length === 0) {
    console.warn(
      '[Config] No settings provided from database. The application will run on default values.'
    )
  } else {
    dbSettings.forEach((setting) => {
      if (setting.key in settings) {
        settings[setting.key] = setting.value
      }
    })
    console.log(
      `[Config] Successfully populated ${dbSettings.length} settings from the database.`
    )
  }
  isInitialized = true
}
