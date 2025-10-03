// apps/pipeline/scripts/migrations/V4_Fix_E24_Scraper_Definitive.js
import dbConnect from '../../../../packages/data-access/src/dbConnect.js'
import { Source } from '../../../../packages/models/src/index.js'
import { logger, reinitializeLogger } from '../../../../packages/utils-server'
import path from 'path'
import mongoose from 'mongoose'

reinitializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'))

async function runMigration() {
  await dbConnect()
  logger.info('🚀 Running migration V4: Definitive Fix for E24 Scraper Selector...')

  try {
    const sourceToUpdate = await Source.findOne({ name: 'E24' })

    if (!sourceToUpdate) {
      logger.warn("Source 'E24' not found. Skipping migration.")
      return
    }

    // DEFINITIVE FIX: This selector targets the specific span inside the h3,
    // which contains the headline text, explicitly excluding the style information.
    const newHeadlineTextSelector = 'h3[id^="title-"] > span'

    sourceToUpdate.headlineTextSelector = newHeadlineTextSelector
    await sourceToUpdate.save()

    logger.info(
      "✅ Successfully updated 'E24' source with new headlineTextSelector:",
      newHeadlineTextSelector
    )
  } catch (error) {
    logger.error({ err: error }, '❌ Migration V4 failed.')
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  }
}

runMigration()
