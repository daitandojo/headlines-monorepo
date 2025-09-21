// apps/pipeline/scripts/maintenance/delete-today.js (version 2.2.0)
undefined
import { logger } from '@headlines/utils-server'
import mongoose from 'mongoose'
import {
  Article,
  SynthesizedEvent,
  Opportunity,
  RunVerdict,
} from '../../../../packages/models/src/index.js'
import dbConnect from '../../../../packages/data-access/src/dbConnect.js'

export async function deleteTodaysDocuments(confirm = false) {
  try {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const query = { createdAt: { $gte: today } }
    const modelsToDelete = {
      Articles: Article,
      'Synthesized Events': SynthesizedEvent,
      Opportunities: Opportunity,
      'Run Verdicts': RunVerdict,
    }
    let totalCount = 0

    // [[ Log All Deleted Documents ]] - First, count documents for each model
    const counts = {}
    for (const [modelName, model] of Object.entries(modelsToDelete)) {
      const count = await model.countDocuments(query)
      if (count > 0) {
        counts[modelName] = count
        totalCount += count
      }
    }

    if (totalCount === 0) {
      logger.info('✅ No documents created today were found to delete.')
      return
    }

    if (!confirm) {
      logger.warn(
        `${totalCount} documents found from today. Run with --delete-today or --yes to delete.`
      )
      return
    }

    logger.info(`Deleting ${totalCount} documents from today...`)
    for (const [modelName, model] of Object.entries(modelsToDelete)) {
      if (counts[modelName] > 0) {
        const { deletedCount } = await model.deleteMany(query)
        logger.info(`  ✅ Deleted ${deletedCount} ${modelName}.`)
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Deletion failed.')
    throw error
  }
}

// Allow script to be run standalone
if (import.meta.url.endsWith(process.argv[1])) {
  ;(async () => {
    const { initializeLogger } = await import('@headlines/utils')
    const path = await import('path')
    initializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'))

    await dbConnect()
    const confirm = process.argv.includes('--yes')
    await deleteTodaysDocuments(confirm)
    if (mongoose.connection.readyState === 1) await mongoose.disconnect()
  })()
}
