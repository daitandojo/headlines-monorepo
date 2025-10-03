// apps/pipeline/scripts/maintenance/clean-e24-headlines.js
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { findArticles, updateArticle } from '@headlines/data-access'

async function cleanE24Headlines() {
  await initializeScriptEnv()
  logger.info('🚀 Starting E24 headline cleanup...')

  try {
    const articlesResult = await findArticles({
      filter: {
        newspaper: 'E24',
        headline: { $regex: /(#title-.*)|(span \{ font-weight)/ },
      },
    })

    if (!articlesResult.success) throw new Error(articlesResult.error)
    const articlesToClean = articlesResult.data

    if (articlesToClean.length === 0) {
      logger.info('✅ No E24 articles with CSS gibberish found. Database is clean.')
      return
    }

    logger.info(`Found ${articlesToClean.length} E24 articles to clean. Updating...`)
    let modifiedCount = 0

    for (const article of articlesToClean) {
      const cleanedHeadline = article.headline
        .replace(/#title-.*?span \{.*?\}/g, '')
        .replace(/#title-.*/, '')
        .trim()

      const updateResult = await updateArticle(article._id, { headline: cleanedHeadline })
      if (updateResult.success) modifiedCount++
    }

    logger.info(`✅ Cleanup complete. Modified ${modifiedCount} articles.`)
  } catch (error) {
    logger.error({ err: error }, '❌ E24 headline cleanup failed.')
  }
}

cleanE24Headlines()
