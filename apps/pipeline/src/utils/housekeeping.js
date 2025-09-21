// apps/pipeline/src/utils/housekeeping.js (version 3.0.0)
import { logger } from '@headlines/utils-server'
import { findSourcesForScraping, performHousekeeping } from '@headlines/actions'

const ARTICLE_RETENTION_DAYS = 14

export async function performDatabaseHousekeeping() {
  logger.info('🧹 Performing database housekeeping...')

  try {
    const dynamicSourcesResult = await findSourcesForScraping({ isDynamicContent: true })
    if (!dynamicSourcesResult.success) throw new Error(dynamicSourcesResult.error)

    const dynamicNewspaperNames = dynamicSourcesResult.data.map((s) => s.name)
    if (dynamicNewspaperNames.length === 0) {
      logger.info(
        'Housekeeping: No sources marked for dynamic content cleanup. Skipping.'
      )
      return
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - ARTICLE_RETENTION_DAYS)
    const deletionCriteria = {
      newspaper: { $in: dynamicNewspaperNames },
      createdAt: { $lt: cutoffDate },
      $and: [
        {
          $or: [
            { relevance_headline: { $lt: 25 } },
            { relevance_headline: { $exists: false } },
          ],
        },
        {
          $or: [
            { relevance_article: { $lt: 25 } },
            { relevance_article: { $exists: false } },
          ],
        },
      ],
    }

    const result = await performHousekeeping(deletionCriteria)
    if (!result.success) throw new Error(result.error)

    if (result.deletedCount > 0) {
      logger.info(
        `Housekeeping complete. Deleted ${result.deletedCount} old, irrelevant articles.`
      )
    } else {
      logger.info('Housekeeping complete. No old, irrelevant articles to delete.')
    }
  } catch (error) {
    logger.error({ err: error }, 'Database housekeeping failed.')
  }
}
