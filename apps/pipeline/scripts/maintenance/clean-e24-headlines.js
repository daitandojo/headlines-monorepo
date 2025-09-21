// apps/pipeline/scripts/maintenance/clean-e24-headlines.js
'use server'

import dbConnect from '../../../../packages/data-access/src/dbConnect.js'
import { Article } from '../../../../packages/models/src/index.js'
import { logger, reinitializeLogger } from '../../../../packages/utils-server'
import path from 'path'
import mongoose from 'mongoose'

reinitializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'))

async function cleanE24Headlines() {
  await dbConnect()
  logger.info('🚀 Starting E24 headline cleanup...')

  try {
    // This regex is more robust and captures multiple patterns of CSS gibberish.
    const articlesToClean = await Article.find({
      newspaper: 'E24',
      headline: { $regex: /(#title-.*)|(span \{ font-weight)/ },
    })

    if (articlesToClean.length === 0) {
      logger.info('✅ No E24 articles with CSS gibberish found. Database is clean.')
      return
    }

    logger.info(
      `Found ${articlesToClean.length} E24 articles to clean. Preparing bulk update...`
    )

    const bulkOps = articlesToClean.map((article) => {
      // Use a more robust regex to remove the CSS part.
      const cleanedHeadline = article.headline
        .replace(/#title-.*?span \{.*?\}/g, '') // Removes the entire CSS block
        .replace(/#title-.*/, '') // Fallback for simpler cases
        .trim()
      return {
        updateOne: {
          filter: { _id: article._id },
          update: { $set: { headline: cleanedHeadline } },
        },
      }
    })

    const result = await Article.bulkWrite(bulkOps)
    logger.info(`✅ Cleanup complete. Modified ${result.modifiedCount} articles.`)
  } catch (error) {
    logger.error({ err: error }, '❌ E24 headline cleanup failed.')
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  }
}

cleanE24Headlines()
