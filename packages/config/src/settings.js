// packages/config/src/settings.js
import { Setting } from '@headlines/models'
// This file must have ZERO workspace dependencies.
// We will use console.log for this critical, low-level module.

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

export async function initializeSettings() {
  if (isInitialized) return
  console.log('[Config] Loading pipeline settings from database...')
  try {
    const dbSettings = await Setting.find({}).lean()
    if (dbSettings.length === 0) {
      console.warn(
        '[Config] No settings found in the database. The pipeline will run on default values.'
      )
    } else {
      dbSettings.forEach((setting) => {
        settings[setting.key] = setting.value
      })
      console.log(
        `[Config] Successfully loaded ${dbSettings.length} settings from the database.`
      )
    }
    isInitialized = true
  } catch (error) {
    console.error(
      '[Config] CRITICAL: Failed to load settings from database. Halting.',
      error
    )
    throw error
  }
}
