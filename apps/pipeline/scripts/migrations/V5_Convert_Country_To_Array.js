// packages/pipeline/scripts/migrations/V5_Convert_Country_To_Array.js
import mongoose from 'mongoose'
import { Article, SynthesizedEvent, Opportunity } from '@headlines/models'
import dbConnect from '@headlines/data-access/dbConnect/node'
import { logger } from '@headlines/utils-shared'
import colors from 'ansi-colors'

async function migrateCollection(model, fieldName) {
  logger.info(
    `Checking collection '${model.collection.collectionName}' for field '${fieldName}'...`
  )
  const filter = { [fieldName]: { $type: 'string' } }
  const count = await model.countDocuments(filter)

  if (count === 0) {
    logger.info(`  ✅ No documents to migrate in '${model.collection.collectionName}'.`)
    return
  }

  logger.warn(
    `  Found ${count} documents to migrate in '${model.collection.collectionName}'.`
  )

  const bulkOps = []
  // DEFINITIVE FIX: Use .lean() to get raw JS objects, bypassing Mongoose's type coercion.
  const cursor = model.find(filter).lean().cursor()

  for await (const doc of cursor) {
    const currentValue = doc[fieldName]

    // Now, currentValue will be the actual string from the DB (e.g., "Denmark"),
    // not an array that Mongoose created in memory (e.g., ["Denmark"]).
    if (typeof currentValue === 'string') {
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { [fieldName]: [currentValue] } },
        },
      })
    }
  }

  if (bulkOps.length > 0) {
    const result = await model.bulkWrite(bulkOps)
    logger.info(
      colors.green(`  ✅ Successfully modified ${result.modifiedCount} documents.`)
    )
  } else {
    // This message should no longer appear with the .lean() fix.
    logger.warn(
      `  Warning: Found ${count} documents but processed 0. This may indicate an issue.`
    )
  }
}

async function runMigration() {
  logger.info(
    '🚀 Starting V5 Migration: Convert `country` and `basedIn` fields to arrays...'
  )
  await dbConnect()

  try {
    await migrateCollection(Article, 'country')
    await migrateCollection(SynthesizedEvent, 'country')
    await migrateCollection(Opportunity, 'basedIn')

    logger.info('✅ Migration V5 completed successfully.')
  } catch (error) {
    logger.fatal({ err: error }, '❌ Migration V5 failed!')
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  }
}

runMigration()
