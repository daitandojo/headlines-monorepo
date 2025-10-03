// apps/server/src/routes/scrapeTest.js (version 1.0.0)
import { Router } from 'express'
import { verifyAdmin } from '../middleware/auth.js'
import { testScraperRecipe } from '@headlines/scraper-logic/node'
import { Source } from '@headlines/models/node'
import { logger } from '@headlines/utils-shared'

const router = Router()

// All routes in this file are protected by the admin verification middleware.
router.use(verifyAdmin)

router.post('/', async (req, res) => {
  const { sourceId, articleUrl } = req.body

  if (!sourceId) {
    return res.status(400).json({ error: 'sourceId is required.' })
  }

  try {
    const source = await Source.findById(sourceId).lean()
    if (!source) {
      return res.status(404).json({ error: 'Source not found.' })
    }

    // Delegate the complex scraping logic to the shared test-orchestrator.
    const result = await testScraperRecipe(source, articleUrl)
    return res.status(200).json(result)
  } catch (error) {
    logger.error({ err: error }, 'Error in /scrape-test endpoint.')
    return res
      .status(500)
      .json({ error: `An internal server error occurred: ${error.message}` })
  }
})

export { router as scrapeTestRoute }
