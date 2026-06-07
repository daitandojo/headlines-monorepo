// apps/server/src/routes/scrapeTest.js (version 1.0.0)
import { Router } from 'express'
import { verifyAdmin } from '../middleware/auth.js'
import { testScraperRecipe } from '@headlines/scraper-logic/node'
import { Source } from '@headlines/models/node'
import { logger } from '@headlines/utils-shared'
import { z } from 'zod'

const router = Router()
router.use(verifyAdmin)

const scrapeSchema = z.object({
  sourceId: z.string().min(1, 'sourceId is required'),
  articleUrl: z.string().url().optional().or(z.literal('')),
})

router.post('/', async (req, res) => {
  const parsed = scrapeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' })
  }
  const { sourceId, articleUrl } = parsed.data

  try {
    const source = await Source.findById(sourceId).lean()
    if (!source) {
      return res.status(404).json({ error: 'Source not found.' })
    }
    const result = await testScraperRecipe(source, articleUrl)
    return res.status(200).json(result)
  } catch (error) {
    logger.error('Scrape test failed:', error.message?.substring(0, 80) || '')
    return res.status(500).json({ error: 'Scrape test failed.', code: 'SCRAPE_ERROR' })
  }
})

export { router as scrapeTestRoute }
