import mongoose from 'mongoose'
import { Source } from '@headlines/models'
import dbConnect from '@headlines/data-access/dbConnect/node'
import { logger } from '@headlines/utils-shared'

async function runMigration() {
  logger.info(
    '🚀 Starting V6 Migration: Remove deprecated `ledeSelector` field from Sources...'
  )
  await dbConnect()

  try {
    const result = await Source.updateMany(
      { ledeSelector: { $exists: true } },
      { $unset: { ledeSelector: '' } }
    )

    logger.info(
      `✅ Migration V6 completed. Removed 'ledeSelector' field from ${result.modifiedCount} documents.`
    )
  } catch (error) {
    logger.fatal({ err: error }, '❌ Migration V6 failed!')
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  }
}

runMigration()
