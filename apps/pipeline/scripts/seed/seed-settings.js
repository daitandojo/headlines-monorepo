// apps/pipeline/scripts/seed/seed-settings.js (version 1.8.0)
import { reinitializeLogger, logger } from '@headlines/utils-server'
import path from 'path'
import { Setting } from '@headlines/models'
import dbConnect from '../../../../packages/data-access/src/dbConnect.js'
import mongoose from 'mongoose'

// Initialize logger for this specific script run
reinitializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'))

const SETTINGS = [
  {
    key: 'HEADLINES_RELEVANCE_THRESHOLD',
    // DEFINITIVE FIX: Lowered from 35 to 25 to widen the funnel and reduce missed articles.
    value: 25,
    description: 'Minimum score (0-100) for a headline to be considered for enrichment.',
    type: 'number',
  },
  {
    key: 'ARTICLES_RELEVANCE_THRESHOLD',
    // FUNNEL WIDENING: Lowered from 50 to 45 to investigate high drop-off rate.
    value: 45,
    description:
      'Minimum score (0-100) for an enriched article to be considered a valid event signal.',
    type: 'number',
  },
  {
    key: 'EVENT_RELEVANCE_THRESHOLD',
    // FUNNEL WIDENING: Lowered from 59 to 55 to capture more borderline events.
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
  await dbConnect()
  logger.info('🚀 Syncing Pipeline Settings from config file...')
  try {
    const bulkOps = SETTINGS.map((setting) => ({
      updateOne: {
        filter: { key: setting.key },
        // Use $set to overwrite existing settings with values from the file.
        // This ensures the file is always the source of truth.
        update: { $set: setting },
        upsert: true,
      },
    }))

    const result = await Setting.bulkWrite(bulkOps)

    // Improved log message to show both new and modified settings.
    logger.info(
      `✅ Settings sync complete. ${result.upsertedCount} new settings added, ${result.modifiedCount} settings updated.`
    )
  } catch (error) {
    logger.fatal({ err: error }, '❌ Settings sync failed.')
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  }
}

seedSettings()
