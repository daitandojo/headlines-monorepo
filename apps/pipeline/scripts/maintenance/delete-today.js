// apps/pipeline/scripts/maintenance/delete-today.js (version 2.2.0)
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { logger } from '@headlines/utils-server'
import mongoose from 'mongoose'
import { Article, SynthesizedEvent, Opportunity, RunVerdict } from '@headlines/models'
import dbConnect from '@headlines/data-access/dbConnect/node'

export async function deleteRecentDocuments({ minutes, confirm = false } = {}) {
  try {
    let cutoff
    let timeDescription
    if (minutes) {
      cutoff = new Date(Date.now() - minutes * 60 * 1000)
      timeDescription = `in the last ${minutes} minutes`
    } else {
      cutoff = new Date()
      cutoff.setUTCHours(0, 0, 0, 0)
      timeDescription = 'today'
    }

    const query = { createdAt: { $gte: cutoff } }
    const modelsToDelete = {
      Articles: Article,
      'Synthesized Events': SynthesizedEvent,
      Opportunities: Opportunity,
      'Run Verdicts': RunVerdict,
    }
    let totalCount = 0

    const counts = {}
    for (const [modelName, model] of Object.entries(modelsToDelete)) {
      const count = await model.countDocuments(query)
      if (count > 0) {
        counts[modelName] = count
        totalCount += count
      }
    }

    if (totalCount === 0) {
      logger.info(`✅ No documents created ${timeDescription} were found to delete.`)
      return
    }

    if (!confirm) {
      logger.warn(
        `${totalCount} documents found from ${timeDescription}. Run with --yes to delete.`
      )
      return
    }

    logger.info(`Deleting ${totalCount} documents from ${timeDescription}...`)
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
    const { initializeLogger } = await import('@headlines/utils-server')
    const path = await import('path')
    initializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'))

    const argv = yargs(hideBin(process.argv))
      .option('minutes', {
        alias: 'm',
        type: 'number',
        description: 'Specify the lookback window in minutes.',
      })
      .option('yes', { type: 'boolean', description: 'Skip confirmation prompt.' })
      .help().argv

    await dbConnect()
    await deleteRecentDocuments({ minutes: argv.minutes, confirm: argv.yes })
    if (mongoose.connection.readyState === 1) await mongoose.disconnect()
  })()
}
