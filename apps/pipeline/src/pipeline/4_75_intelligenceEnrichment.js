// apps/pipeline/src/pipeline/4_75_intelligenceEnrichment.js
// Tier 1 Intelligence Enrichment Stage
// Orchestrates all 5 intelligence modules after synthesis but before final commit
import { logger } from '@headlines/utils-shared'
import { scrapeAllFilings } from '../modules/filings/filingScraper.js'
import { discoverFamilyOffices } from '../modules/familyOfficeDiscoveryV2.js'
import { extractDealAdvisors } from '../modules/dealAdvisorTracker.js'
import { resolveWealthChains } from '../modules/wealthChainResolver.js'
import { recomputeAllScores } from '../modules/sentimentEngine.js'

export async function runIntelligenceEnrichment(context) {
  const { synthesizedEvents, opportunitiesToSave, runStatsManager, emitter, runId } = context
  let hasData = false

  if (synthesizedEvents?.length) hasData = true
  if (opportunitiesToSave?.length) hasData = true
  // Filing scraper runs regardless (it's a background periodic task)
  hasData = true

  if (!hasData) {
    logger.warn('[IntelligenceEnrichment] No data to process, skipping')
    return { success: true, payload: context }
  }

  try {
    // 1. Regulatory Filing Scraper (background, frequency-controlled internally)
    emitter?.stageStart('filingScraper')
    const filings = await scrapeAllFilings(runId)
    runStatsManager.set('filingsFound', filings.length)
    emitter?.stageEnd('filingScraper')

    // 2. Family Office Discovery (proactive, uses Kimi K2 web search)
    const events = synthesizedEvents || []
    const opps = opportunitiesToSave || []
    if (events.length > 0 || opps.length > 0) {
      emitter?.stageStart('familyOfficeDiscovery')
      const fos = await discoverFamilyOffices(events, opps)
      runStatsManager.set('familyOfficesDiscovered', fos.length)
      emitter?.stageEnd('familyOfficeDiscovery')
    }

    // These run on the current events in context
    const enrichedEvents = context.savedEvents || synthesizedEvents || []

    if (enrichedEvents.length > 0) {
      // 3. Deal Advisor Extraction
      emitter?.stageStart('dealAdvisorExtraction')
      const advisors = await extractDealAdvisors(enrichedEvents)
      runStatsManager.set('dealAdvisorsFound', advisors.length)
      emitter?.stageEnd('dealAdvisorExtraction')

      // 4. Wealth Chain Resolution
      emitter?.stageStart('wealthChainResolution')
      const wealthChains = await resolveWealthChains(enrichedEvents, runId)
      runStatsManager.set('wealthChainsResolved', wealthChains.length)
      emitter?.stageEnd('wealthChainResolution')

      // 5. Sentiment & Confidence recompute
      emitter?.stageStart('sentimentRecompute')
      const sentimentResult = await recomputeAllScores()
      runStatsManager.set('sentimentUpdated', sentimentResult.updated)
      emitter?.stageEnd('sentimentRecompute')
    }

    logger.info('[IntelligenceEnrichment] All Tier 1 modules completed')
    return { success: true, payload: context }
  } catch (err) {
    logger.error({ err: err.message }, '[IntelligenceEnrichment] Stage failed')
    runStatsManager.push('errors', `INTELLIGENCE_ENRICHMENT: ${err.message}`)
    return { success: false, payload: context }
  }
}