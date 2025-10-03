// apps/pipeline/scripts/seed/seed-settings.js
import { logger } from '@headlines/utils-shared'
import { initializeScriptEnv } from './lib/script-init.js'
import { updateSettings } from '@headlines/data-access'

const SETTINGS = [
  {
    key: 'HEADLINES_RELEVANCE_THRESHOLD',
    value: 25,
    description: 'Minimum score (0-100) for a headline to be considered for enrichment.',
    type: 'number',
  },
  {
    key: 'ARTICLES_RELEVANCE_THRESHOLD',
    value: 45,
    description:
      'Minimum score (0-100) for an enriched article to be considered a valid event signal.',
    type: 'number',
  },
  {
    key: 'EVENT_RELEVANCE_THRESHOLD',
    value: 55,
    description:
      'Minimum score for a synthesized event to be saved and sent in notifications.',
    type: 'number',
  },
  {
    key: 'MINIMUM_EVENT_AMOUNT_USD_MILLIONS',
    value: 20,
    description: 'Events with a detected financial amount below this will be dropped.',
    type: 'number',
  },
  {
    key: 'HIGH_SIGNAL_HEADLINE_THRESHOLD',
    value: 90,
    description:
      'Headlines scoring above this are considered high-signal and trigger special processing if content scraping fails.',
    type: 'number',
  },
  {
    key: 'AGENT_DISAGREEMENT_THRESHOLD',
    value: 50,
    description:
      'If headline score and article score differ by more than this, it is flagged as a disagreement.',
    type: 'number',
  },
  {
    key: 'SINGLETON_RELEVANCE_THRESHOLD',
    value: 85,
    description:
      'An article that does not cluster with others must meet this score to be processed as a standalone event.',
    type: 'number',
  },
  {
    key: 'HIGH_VALUE_DEAL_USD_MM',
    value: 50,
    description:
      'AI Prompt: The dollar amount (in millions) that defines a "high value" M&A deal.',
    type: 'number',
  },
  {
    key: 'SIGNIFICANT_PRIVATE_BENEFICIARY_USD_MM',
    value: 30,
    description:
      'AI Prompt: The wealth threshold (in millions) for extracting an individual as a key contact.',
    type: 'number',
  },
  {
    key: 'WATCHLIST_SCORE_BOOST',
    value: 35,
    description:
      "The number of points to add to a headline's relevance score if it matches a watchlist entity.",
    type: 'number',
  },
  {
    key: 'SUGGESTION_GENERATION_THRESHOLD',
    value: 80,
    description:
      'The minimum event score required to trigger the AI to look for new watchlist suggestions.',
    type: 'number',
  },
  {
    key: 'MIN_ARTICLE_CHARS',
    value: 100,
    description:
      'The minimum number of characters required for scraped article content to be considered valid.',
    type: 'number',
  },
  {
    key: 'LLM_MODEL_HEADLINE_ASSESSMENT',
    value: 'gpt-5-mini',
    description: 'LLM model used for the initial, high-volume headline assessment stage.',
    type: 'string',
  },
  {
    key: 'LLM_MODEL_ARTICLE_ASSESSMENT',
    value: 'gpt-5-mini',
    description: 'LLM model used for full article analysis and enrichment.',
    type: 'string',
  },
  {
    key: 'LLM_MODEL_SYNTHESIS',
    value: 'gpt-5-mini',
    description:
      'LLM model used for clustering, synthesis, and other high-level reasoning tasks.',
    type: 'string',
  },
  {
    key: 'LLM_MODEL_UTILITY',
    value: 'gpt-5-nano',
    description:
      'A smaller, faster model for simple, utility-focused tasks like classification or extraction.',
    type: 'string',
  },
]

async function seedSettings() {
  await initializeScriptEnv()
  logger.info('🚀 Syncing Pipeline Settings from config file...')
  try {
    const result = await updateSettings(SETTINGS)
    if (!result.success) throw new Error(result.error)

    logger.info(`✅ Settings sync complete. ${result.message}`)
  } catch (error) {
    logger.fatal({ err: error }, '❌ Settings sync failed.')
  }
}

seedSettings()
