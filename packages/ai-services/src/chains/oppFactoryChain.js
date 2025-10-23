// packages/ai-services/src/chains/oppFactoryChain.js
import { AIAgent } from '../lib/AIAgent.js'
import { instructionOppFactory } from '@headlines/prompts'
import { settings } from '@headlines/config'
import { opportunitySchema } from '@headlines/models/schemas'
import { logger } from '@headlines/utils-shared'
import { performGoogleSearch } from '../search/search.js'
import { browserManager } from '@headlines/scraper-logic'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_PRO,
    systemPrompt: instructionOppFactory,
    zodSchema: opportunitySchema,
  })

// --- START OF DEFINITIVE FIX: Re-architecting the OppFactory ---
async function scrapePagesForContext(urls) {
  const texts = []
  if (urls.length === 0) return ''

  for (const url of urls.slice(0, 3)) {
    // Limit to top 3 results for speed
    try {
      const page = await browserManager.newPage()
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const html = await page.content()
      const doc = new JSDOM(html, { url })
      const reader = new Readability(doc.window.document)
      const article = reader.parse()
      if (article && article.textContent) {
        texts.push(article.textContent.replace(/\s+/g, ' ').trim())
        logger.trace(`  -> Scraped context from: ${url}`)
      }
      await page.close()
    } catch (e) {
      logger.warn(`  -> Failed to scrape context from ${url}: ${e.message}`)
    }
  }
  return texts.join('\n\n---\n\n')
}

async function invoke(input) {
  const agent = getAgent()

  // Step 1: Retrieve - Perform targeted searches
  logger.info(`[OppFactory] Step 1/2: Researching "${input.name}"...`)
  const searchQueries = [
    `who owns "${input.name}"`,
    `"${input.name}" net worth`,
    `"${input.name}" founder`,
    `"${input.name}" family office`,
  ]
  const searchPromises = searchQueries.map((q) =>
    performGoogleSearch(q, { numResults: 2 })
  )
  const searchResults = await Promise.all(searchPromises)
  const allLinks = searchResults.flatMap((r) =>
    r.success ? r.results.map((i) => i.link) : []
  )
  const uniqueLinks = [...new Set(allLinks)]

  // Step 2: Scrape - Get readable content from top links
  const contextText = await scrapePagesForContext(uniqueLinks)
  if (contextText.length < 200) {
    logger.warn(
      `[OppFactory] Insufficient context found for "${input.name}" after scraping. Aborting dossier creation.`
    )
    return { error: 'Insufficient context found for dossier creation.' }
  }

  // Step 3: Synthesize - Call the AI with the prepared context
  logger.info(`[OppFactory] Step 2/2: Synthesizing dossier for "${input.name}"...`)
  const userContent = `Target Name: ${input.name}\n\n--- Scraped Research ---\n${contextText}`
  const result = await agent.execute(userContent)

  if (
    result &&
    !result.error &&
    result.opportunities &&
    result.opportunities.length > 0
  ) {
    const opp = result.opportunities[0]
    if (!opp.whyContact || opp.whyContact.length === 0) {
      opp.whyContact = [
        `Identified as a high-value entity (${input.name}) based on proactive research, warranting further investigation and potential outreach.`,
      ]
    }
  }

  return result
}
// --- END OF DEFINITIVE FIX ---

export const oppFactoryChain = { invoke }
