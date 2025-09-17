// scripts/migrations/V1_Fix_Scraper_Selectors.js (version 1.0)
import 'dotenv/config'
import { connectDatabase, disconnectDatabase } from '../../src/database.js'
import Source from '../../models/Source.js'
import { logger } from '@headlines/utils/src/logger.js'

const MIGRATION_NAME = 'V1_Fix_Scraper_Selectors'

const UPDATES = [
  // Fix Content Scraper Failures
  {
    name: 'Økonomisk Ugebrev',
    update: { articleSelector: 'div.elementor-widget-theme-post-content' },
  },
  { name: 'NRK', update: { articleSelector: 'div.article-body' } },
  {
    name: 'Dagens Næringsliv',
    update: { articleSelector: 'div[class*="content"] p, .dn-article-body' },
  },

  // Fix Headline Scraper Failures for PE Firms by switching to the enhanced dynamic extractor
  {
    name: 'Maj Invest',
    update: {
      extractionMethod: 'declarative',
      headlineSelector: 'div.news-item',
      linkSelector: 'a',
      headlineTextSelector: 'h3',
    },
  },
  {
    name: 'PAI Partners',
    update: {
      extractionMethod: 'declarative',
      headlineSelector: 'a.news-list__item',
      linkSelector: null, // Link is on the main element
      headlineTextSelector: 'h3',
    },
  },
  {
    name: 'IK Partners',
    update: {
      extractionMethod: 'declarative',
      headlineSelector: 'a.news-card',
      linkSelector: null,
      headlineTextSelector: 'h4',
    },
  },
  {
    name: 'Triton Partners',
    update: {
      extractionMethod: 'declarative',
      headlineSelector: 'div.news-card',
      linkSelector: 'a',
      headlineTextSelector: 'h3.news-card__title',
    },
  },
  {
    name: 'Hg Capital',
    update: {
      extractionMethod: 'declarative',
      headlineSelector: 'div.insights-card__content',
      linkSelector: 'a',
      headlineTextSelector: 'h3',
    },
  },
  {
    name: 'CVC Capital Partners',
    update: {
      extractionMethod: 'declarative',
      headlineSelector: 'a.news-listing-item__container',
      linkSelector: null,
      headlineTextSelector: 'h2',
    },
  },
  {
    name: 'Mergermarket',
    update: {
      extractionMethod: 'declarative',
      headlineSelector: 'div.teasers > a',
      linkSelector: null,
      headlineTextSelector: 'div.title',
    },
  },
]

async function runMigration() {
  logger.info(`🚀 Starting migration: ${MIGRATION_NAME}...`)
  await connectDatabase()

  try {
    const bulkOps = UPDATES.map(({ name, update }) => ({
      updateOne: {
        filter: { name },
        update: { $set: update },
      },
    }))

    if (bulkOps.length > 0) {
      const result = await Source.bulkWrite(bulkOps)
      logger.info(
        `Migration complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}.`
      )
    } else {
      logger.info('No updates to perform.')
    }
  } catch (error) {
    logger.fatal({ err: error }, `❌ Migration ${MIGRATION_NAME} failed!`)
  } finally {
    await disconnectDatabase()
  }
}

runMigration()
