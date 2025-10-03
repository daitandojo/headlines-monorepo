// apps/pipeline/scripts/migrations/V3_Fix_E24_Scraper.js
import dbConnect from '../../packages/data-access/src/dbConnect.js'
import { Source } from '@headlines/models'
import { logger, reinitializeLogger } from '@headlines/utils-server'
import path from 'path'

reinitializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'))

async function runMigration() {
  await dbConnect()
  logger.info('🚀 Running migration V3: Fix E24 Scraper Selector...')

  try {
    const sourceToUpdate = await Source.findOne({ name: 'E24' })

    if (!sourceToUpdate) {
      logger.warn("Source 'E24' not found. Skipping migration.")
      return
    }

    // The old selector was too broad and picked up style tags.
    // This new selector specifically targets the headline text within the link.
    const newHeadlineTextSelector = 'h3[class^="css-"]'

    sourceToUpdate.headlineTextSelector = newHeadlineTextSelector
    await sourceToUpdate.save()

    logger.info(
      "✅ Successfully updated 'E24' source with new headlineTextSelector:",
      newHeadlineTextSelector
    )
  } catch (error) {
    logger.error({ err: error }, '❌ Migration V3 failed.')
  } finally {
    await mongoose.disconnect()
  }
}

runMigration()
